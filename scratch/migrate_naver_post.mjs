import fs from 'fs';
import * as cheerio from 'cheerio';
import { put } from '@vercel/blob';

// 환경 변수 안전 로드
try {
  const envFile = fs.readFileSync('.env', 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)="?(.*?)"?$/);
    if (match) {
      if (!process.env[match[1]]) process.env[match[1]] = match[2];
    }
  });
} catch(e) {}

// 병렬 처리 컨트롤러 (한 번에 10장씩만 업로드하여 과부하 방지)
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

// 네이버 원본 이미지 -> Vercel Blob 업로드
async function uploadImage(src, index) {
    const rawUrl = src.split('?')[0]; 
    let fetchUrl = rawUrl + "?type=w800"; // 고품질 w800 해상도로 강제 렌더링
    
    console.log(`[Upload ${index}] Fetching ${fetchUrl.substring(0, 50)}...`);
    try {
        const imgRes = await fetch(fetchUrl, {
            headers: { 'Referer': 'https://m.blog.naver.com/' }
        });
        if (!imgRes.ok) throw new Error("Status: " + imgRes.status);
        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const fileName = `migrated_taipei_${Date.now()}_${index}.jpg`;
         
        const blob = await put(`naver-migration/${fileName}`, buffer, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN
        });
        return blob.url;
    } catch(e) {
        console.error(`[Upload] Failed ${fetchUrl}: ${e.message}`);
        return fetchUrl; // 실패 시 네이버 원본 유지
    }
}

async function run() {
  console.log('📌 Fetching Naver Blog mobile page...');
  const res = await fetch('https://m.blog.naver.com/cine_ma/223873575115', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
    }
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  const title = $('.se-title-text').text().trim() || '25.04.01 타이베이/ 쑹산공항, 용산사, 라오허제 야시장/ 디카';
  
  let markdown = '';
  let allImages = [];
  
  const components = $('.se-component');
  console.log(`📌 Processing ${components.length} components...`);

  let imageElementsToUpload = [];

  for (let i = 0; i < components.length; i++) {
    const $el = $(components[i]);
    
    if ($el.hasClass('se-text')) {
      const text = $el.find('.se-module-text').text().trim();
      if (text) {
          markdown += text + '\n\n';
      }
    } 
    else if ($el.hasClass('se-image') || $el.hasClass('se-imageGroup')) {
       // 이미지 그룹 발견 (1열 혹은 다열)
       const imgs = $el.find('img.se-image-resource');
       const srcs = imgs.map((_, img) => $(img).attr('data-lazy-src') || $(img).attr('src')).get().filter(Boolean);
       
       if (srcs.length > 0) {
           imageElementsToUpload.push({ type: 'image', srcs });
           markdown += `[[IMAGE_PLACEHOLDER_${imageElementsToUpload.length - 1}]]\n\n`;
       }
    }
    // 지도 처리
    else if ($el.find('.se-map-title, .se-title').length > 0) {
       const placeName = $el.find('.se-map-title, .se-title').text().trim();
       if (placeName) {
           markdown += `[📍 ${placeName}](https://maps.google.com/maps?q=${encodeURIComponent(placeName)})\n\n`;
       }
    }
  }

  console.log(`📌 Found ${imageElementsToUpload.length} image groups. Commencing parallel uploads...`);
  
  // 모든 이미지 URL을 1차원으로 풀어서 동시 업로드 최적화
  let flatUrls = [];
  imageElementsToUpload.forEach(group => flatUrls.push(...group.srcs));
  
  console.log(`📸 Total 225+ images to upload to Vercel Blob!`);
  // 한 번에 10개씩 업로드 (약 1~2분 소요 예상)
  const uploadedUrls = await mapConcurrent(flatUrls, 10, uploadImage);
  allImages = uploadedUrls;

  // 마크다운 플레이스홀더를 새 업로드 주소로 교체
  let urlIndex = 0;
  for (let i = 0; i < imageElementsToUpload.length; i++) {
      const groupCount = imageElementsToUpload[i].srcs.length;
      const newUrls = uploadedUrls.slice(urlIndex, urlIndex + groupCount);
      urlIndex += groupCount;

      let replacement = '';
      if (newUrls.length > 1) {
         replacement = `![COLLAGE](${newUrls.join(',')})`; // 2열 이상은 콜라주로 렌더링
      } else {
         replacement = `![Image](${newUrls[0]})`;
      }
      markdown = markdown.replace(`[[IMAGE_PLACEHOLDER_${i}]]`, replacement);
  }

  const thumbnailUrl = allImages.length > 0 ? allImages[0] : null;

  const article = {
      title,
      content: markdown.trim(),
      thumbnailUrl,
      images: allImages,
      category: '여행'
  };

  fs.writeFileSync('scratch/migrated_post.json', JSON.stringify(article, null, 2));
  console.log(`\n✅ Migration Complete! Saved data to scratch/migrated_post.json`);
}

run().catch(console.error);
