import fs from 'fs';
import * as cheerio from 'cheerio';

async function runTest() {
  console.log('Fetching Naver Blog mobile page...');
  const res = await fetch('https://m.blog.naver.com/cine_ma/223873575115', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
    }
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  const title = $('.se-title-text').text().trim() || '25.04.01 타이베이';
  console.log('Title extracted:', title);

  let imageCount = 0;
  let textBlocks = 0;

  const components = $('.se-component');
  console.log(`Found ${components.length} total blocks to parse.`);

  components.each((i, el) => {
    const $el = $(el);
    if ($el.hasClass('se-text')) {
      const text = $el.find('.se-module-text').text().trim();
      if (text) textBlocks++;
    } else if ($el.hasClass('se-image') || $el.hasClass('se-imageGroup')) {
      const imgs = $el.find('img.se-image-resource');
      imageCount += imgs.length;
    }
  });

  console.log(`\n✅ Parsing Result:`);
  console.log(`- Text Paragraphs identified: ${textBlocks}`);
  console.log(`- Images identified: ${imageCount}`);
  
  if (imageCount < 200) {
     console.log('⚠️ Warning: Not all images were parsed (Expected ~225). DOM structure might need adjustment.');
  } else {
     console.log('🚀 Ready for full migration!');
  }
}

runTest().catch(console.error);
