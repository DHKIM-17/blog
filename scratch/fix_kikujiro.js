const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(process.cwd(), 'prisma', 'dev.db'));

// kikujiro 글 본문 확인
const article = db.prepare("SELECT id, title, content, thumbnailUrl, images FROM Article WHERE id = 8").get();
console.log('Title:', article.title);
console.log('Content:', article.content);
console.log('Current thumbnailUrl:', article.thumbnailUrl);
console.log('Current images:', article.images);

// 본문에서 마크다운 이미지 URL 추출
const regex = /!\[.*?\]\((\/uploads\/[^\)]+)\)/g;
const urls = [];
let match;
while ((match = regex.exec(article.content)) !== null) {
  urls.push(match[1]);
}
console.log('\nExtracted image URLs from content:', urls);

if (urls.length > 0) {
  // 첫 번째 이미지를 썸네일로, 모든 이미지를 images에 저장
  db.prepare("UPDATE Article SET thumbnailUrl = ?, images = ? WHERE id = 8").run(urls[0], JSON.stringify(urls));
  console.log('Fixed! thumbnailUrl =', urls[0], ', images =', JSON.stringify(urls));
} else {
  console.log('No images found in content. Nothing to fix.');
}
