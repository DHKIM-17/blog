import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { articleDb } from '@/lib/db';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

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

async function uploadImageToR2(src) {
  const fetchUrl = src; 
  try {
    const imgRes = await fetch(fetchUrl, { headers: { 'Referer': 'https://m.blog.naver.com/' } });
    if (!imgRes.ok) throw new Error("Status: " + imgRes.status);
    
    const arrayBuffer = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const objectKey = `uploads/migrated-${timestamp}-${randomStr}.jpg`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: objectKey,
      Body: buffer,
      ContentType: contentType,
    });
    
    await s3Client.send(command);
    return `${process.env.R2_PUBLIC_URL.replace(/\/$/, '')}/${objectKey}`;
  } catch(e) {
    return fetchUrl; 
  }
}

async function processUrl(url) {
  const res = await fetch(url, { headers: HEADERS });
  const html = await res.text();
  const $ = cheerio.load(html);

  let title = $('.se-title-text').text().trim() || `마이그레이션 포스트 ${Date.now()}`;
  
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
  
  const uploadedUrls = await mapConcurrent(flatUrls, 10, uploadImageToR2);

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
  const category = '유럽생활일지';
  const now = new Date().toISOString();
  
  const newArticle = await articleDb.create({
    title,
    content: markdown.trim(),
    thumbnailUrl,
    images: uploadedUrls,
    category,
    createdAt: now,
  });
  
  return { title, id: newArticle.id };
}

export async function GET() {
  const urls = [
    "https://m.blog.naver.com/cine_ma/223551362281",
    "https://m.blog.naver.com/cine_ma/223551353820",
    "https://m.blog.naver.com/cine_ma/223551404332"
  ];

  let results = [];
  try {
    for (const url of urls) {
      const res = await processUrl(url);
      results.push(res);
    }
    return NextResponse.json({ success: true, results });
  } catch(e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
