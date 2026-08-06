import fs from 'fs';
import { put } from '@vercel/blob';
import { sql } from '@vercel/postgres';

try {
  const parseEnv = (filePath) => {
    try {
      const envFile = fs.readFileSync(filePath, 'utf8');
      envFile.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)="?(.*?)"?$/);
        if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
      });
    } catch(e) {}
  };
  // Blob 키와 DB 키가 각각 나뉘어져 있으므로 2개 다 로드
  parseEnv('../.env');
  parseEnv('../.env.development.local');
} catch(e) {}

const HEADERS = {
  'Referer': 'https://m.blog.naver.com/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'image/webp,*/*;q=0.8'
};

async function mapConcurrent(arr, maxConcurrent, mapFn) {
  const result = new Array(arr.length);
  let i = 0;
  async function worker() {
    while (i < arr.length) {
      const idx = i++;
      try {
        result[idx] = await mapFn(arr[idx], idx);
      } catch (e) {
        console.error(`Task ${idx} failed:`, e);
      }
    }
  }
  const workers = Array.from({length: Math.min(arr.length, maxConcurrent)}, worker);
  await Promise.all(workers);
  return result;
}

// 강제 지연 함수 (과부하 방어용)
const delay = ms => new Promise(res => setTimeout(res, ms));

async function retryUploadImage(src) {
    const cleanUrl = src.split('?')[0]; 
    // 네이버 서버 종류(호스트)에 따라 파라미터 차등 적용
    let fetchUrl = cleanUrl;
    if (cleanUrl.includes('mblogthumb-phinf')) {
        fetchUrl += '?type=w800'; 
    }
    
    // 재시도는 횟수를 두고 가장 천천히 진행
    for (let attempts = 0; attempts < 3; attempts++) {
        try {
            await delay(1200); // 1.2초 휴식
            
            const imgRes = await fetch(fetchUrl, { headers: HEADERS });
            if (!imgRes.ok) throw new Error("Status: " + imgRes.status);
            
            const arrayBuffer = await imgRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const fileName = `hotfix_${Date.now()}_${Math.floor(Math.random()*10000)}.jpg`;
            
            const blob = await put(`naver-migration/${fileName}`, buffer, {
                access: 'public',
                token: process.env.BLOB_READ_WRITE_TOKEN
            });
            return blob.url;
        } catch(e) {
            console.log(`     [Retry ${attempts+1} Failed]: ${e.message}`);
            if (attempts === 2) return null; // 3번 다 실패하면 영구 포기
        }
    }
}

async function fixBrokenImages() {
  console.log("Fetching all articles to find broken pstatic.net images...");
  const { rows: articles } = await sql`SELECT id, title, content, "thumbnailUrl", images FROM Article ORDER BY id ASC`;
  
  for (const article of articles) {
    // 본문 혹은 썸네일에 pstatic.net(네이버 원본) 주소가 버젓이 남아있는 글만 타겟팅
    if (!article.content.includes('blogfiles.pstatic.net') && (!article.thumbnailUrl || !article.thumbnailUrl.includes('blogfiles.pstatic.net'))) {
       continue; // 멀쩡한 글은 통과
    }

    console.log(`\n======================================================`);
    console.log(`[Fixing Article ID: ${article.id}] ${article.title}`);

    // 정규식으로 네이버 주소만 족집게 추출 (콤마, 따옴표, 괄호 등 제외)
    const brokenPattern = /https:\/\/[a-zA-Z0-9-.]*pstatic\.net[^\s"()\],]*/g;
    let matches = article.content.match(brokenPattern) || [];
    
    if (article.thumbnailUrl && article.thumbnailUrl.includes('pstatic.net')) {
       matches.push(article.thumbnailUrl);
    }
    
    // 중복 제거
    matches = [...new Set(matches)];
    
    if (matches.length === 0) {
        console.log("No broken URLs found despite keyword match.");
        continue;
    }

    console.log(`   Found ${matches.length} broken images. Attempting recovery...`);
    
    const urlMapping = {};
    // 병렬 처리를 2개로 극단적으로 낮춰서 API 제한을 피함
    const newUrls = await mapConcurrent(matches, 2, async (brokenUrl, i) => {
        console.log(`     -> Recovering ${i+1}/${matches.length}...`);
        const fixedUrl = await retryUploadImage(brokenUrl);
        if (fixedUrl) {
            urlMapping[brokenUrl] = fixedUrl;
            return fixedUrl;
        }
        return brokenUrl;
    });

    let newContent = article.content;
    let newThumbnailUrl = article.thumbnailUrl;
    
    let newImages = [];
    if (typeof article.images === 'string') {
        try { newImages = JSON.parse(article.images); } catch(e) {}
    } else if (Array.isArray(article.images)) {
        newImages = [...article.images];
    }

    Object.keys(urlMapping).forEach(brokenUrl => {
        const fixedUrl = urlMapping[brokenUrl];
        
        // 본문(markdown) 엑스박스 치환
        newContent = newContent.split(brokenUrl).join(fixedUrl);
        // 썸네일 치환
        if (newThumbnailUrl === brokenUrl) {
            newThumbnailUrl = fixedUrl;
        }
        // 저장 이미지 배열 치환
        newImages = newImages.map(img => img === brokenUrl ? fixedUrl : img);
    });

    const imagesJson = JSON.stringify(newImages);

    await sql`
        UPDATE Article 
        SET content = ${newContent}, 
            "thumbnailUrl" = ${newThumbnailUrl}, 
            images = ${imagesJson} 
        WHERE id = ${article.id}
    `;
    
    console.log(`   ✅ Article ID: ${article.id} Fixed Completed!`);
  }
  
  console.log("\n🎉 All broken articles have been scanned and repaired!");
  process.exit(0);
}

fixBrokenImages();
