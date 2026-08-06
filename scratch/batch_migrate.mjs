import fs from 'fs';
import * as cheerio from 'cheerio';
import { put } from '@vercel/blob';
import { sql } from '@vercel/postgres';

try {
  const envFile = fs.readFileSync('../.env.development.local', 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)="?(.*?)"?$/);
    if (match) {
      if (!process.env[match[1]]) process.env[match[1]] = match[2];
    }
  });
} catch(e) {}

const urls = [
  "https://m.blog.naver.com/cine_ma/223873599133",
  "https://m.blog.naver.com/cine_ma/223873616134",
  "https://m.blog.naver.com/cine_ma/223874135751",
  "https://m.blog.naver.com/cine_ma/223897532860",
  "https://m.blog.naver.com/cine_ma/224000329085",
  "https://m.blog.naver.com/cine_ma/224020568681",
  "https://m.blog.naver.com/cine_ma/224020592171",
  "https://m.blog.naver.com/cine_ma/224020615980",
  "https://m.blog.naver.com/cine_ma/224020764824",
  "https://m.blog.naver.com/cine_ma/224020772983"
];

// 네이버 봇 차단 방어용 가짜 헤더
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
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

async function uploadImage(src) {
    const rawUrl = src.split('?')[0]; 
    let fetchUrl = rawUrl + "?type=w800"; // 무료 용량 압박을 방지위해 압축본(w800) 가져옴
    
    try {
        const imgRes = await fetch(fetchUrl, { headers: { 'Referer': 'https://m.blog.naver.com/' } });
        if (!imgRes.ok) throw new Error("Status: " + imgRes.status);
        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const fileName = `batch_taipei_${Date.now()}_${Math.floor(Math.random()*10000)}.jpg`;
         
        const blob = await put(`naver-migration/${fileName}`, buffer, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN
        });
        return blob.url;
    } catch(e) {
        return fetchUrl; // 용량 초과 등 실패 시 네이버 원본 유지(차선책)
    }
}

async function processUrl(url, index) {
  console.log(`\n===========================================`);
  console.log(`[${index + 1}/${urls.length}] Processing: ${url}`);
  
  const res = await fetch(url, { headers: HEADERS });
  const html = await res.text();
  const $ = cheerio.load(html);

  let title = $('.se-title-text').text().trim();
  if (!title) title = `마이그레이션 포스트 ${Date.now()}`;
  
  let markdown = '';
  let imageElementsToUpload = [];
  const components = $('.se-component');
  
  for (let i = 0; i < components.length; i++) {
    const $el = $(components[i]);
    if ($el.hasClass('se-text')) {
      const text = $el.find('.se-module-text').text().trim();
      if (text) markdown += text + '\n\n';
    } 
    else if ($el.hasClass('se-image') || $el.hasClass('se-imageGroup')) {
       const imgs = $el.find('img.se-image-resource');
       const srcs = imgs.map((_, img) => $(img).attr('data-lazy-src') || $(img).attr('src')).get().filter(Boolean);
       if (srcs.length > 0) {
           imageElementsToUpload.push({ type: 'image', srcs });
           markdown += `[[IMAGE_PLACEHOLDER_${imageElementsToUpload.length - 1}]]\n\n`;
       }
    }
    else if ($el.find('.se-map-title, .se-title').length > 0) {
       const placeName = $el.find('.se-map-title, .se-title').text().trim();
       if (placeName) {
           markdown += `[📍 ${placeName}](https://maps.google.com/maps?q=${encodeURIComponent(placeName)})\n\n`;
       }
    }
  }

  let flatUrls = [];
  imageElementsToUpload.forEach(group => flatUrls.push(...group.srcs));
  
  console.log(`   Photographs found: ${flatUrls.length} -> Uploading...`);
  
  // 무료 요금제 과부하를 막기 위해 병렬 업로드 개수를 5개로 하향 조정
  const uploadedUrls = await mapConcurrent(flatUrls, 5, uploadImage);

  let urlIndex = 0;
  for (let i = 0; i < imageElementsToUpload.length; i++) {
      const groupCount = imageElementsToUpload[i].srcs.length;
      const newUrls = uploadedUrls.slice(urlIndex, urlIndex + groupCount);
      urlIndex += groupCount;

      let replacement = '';
      if (newUrls.length > 1) {
         replacement = `![COLLAGE](${newUrls.join(',')})`;
      } else {
         replacement = `![Image](${newUrls[0]})`;
      }
      markdown = markdown.replace(`[[IMAGE_PLACEHOLDER_${i}]]`, replacement);
  }

  const thumbnailUrl = uploadedUrls.length > 0 ? uploadedUrls[0] : null;
  const category = '여행';
  // 네이버 원글 시간을 알 수 없어 현재 시간으로 맞춤 (추후 수정 페이지에서 개별 수정 권장)
  const now = new Date().toISOString(); 
  const imagesJson = JSON.stringify(uploadedUrls);

  console.log(`   Uploading complete. Title: ${title}`);
  
  const { rows } = await sql`
      INSERT INTO Article (title, content, "thumbnailUrl", images, category, "createdAt", "updatedAt") 
      VALUES (${title}, ${markdown.trim()}, ${thumbnailUrl}, ${imagesJson}, ${category}, ${now}, ${now}) 
      RETURNING id
    `;
    
  console.log(`   ✅ DB Inserted live! ID: ${rows[0].id}`);
  
  // Vercel Postgres 연속 연결 시 타임아웃 방지 대기시간
  await new Promise(r => setTimeout(r, 2000));
}

async function runAll() {
    for (let i = 0; i < urls.length; i++) {
       try {
           await processUrl(urls[i], i);
       } catch (err) {
           console.error(`   ❌ Failed to process ${urls[i]}: ${err.message}`);
       }
    }
    console.log(`\n🎉 All ${urls.length} articles have been successfully batch-processed!`);
    process.exit(0);
}

runAll();
