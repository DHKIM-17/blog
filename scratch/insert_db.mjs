import fs from 'fs';
import { sql } from '@vercel/postgres';

// Vercel 운영 환경 암호키 로드 (.env.development.local)
try {
  const envFile = fs.readFileSync('.env.development.local', 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)="?(.*?)"?$/);
    if (match) {
      if (!process.env[match[1]]) process.env[match[1]] = match[2];
    }
  });
} catch(e) {
  console.log('Env file load failed:', e);
}

async function insert() {
    console.log('📌 Connecting to online Vercel Postgres...');
    const data = JSON.parse(fs.readFileSync('scratch/migrated_post.json', 'utf8'));

    const title = data.title;
    const content = data.content;
    const thumbnailUrl = data.thumbnailUrl;
    const imagesJson = JSON.stringify(data.images);
    const category = data.category || '여행';
    const now = new Date().toISOString();

    console.log(`📌 Inserting article "${title}"`);
    console.log(`   - Images count: ${data.images.length}`);
    console.log(`   - Category: ${category}`);

    // DB 직통 삽입 쿼리
    const { rows } = await sql`
      INSERT INTO Article (title, content, "thumbnailUrl", images, category, "createdAt", "updatedAt") 
      VALUES (${title}, ${content}, ${thumbnailUrl}, ${imagesJson}, ${category}, ${now}, ${now}) 
      RETURNING id, title
    `;

    console.log(`\n✅ Successfully inserted article to live DB!`);
    console.log(`   Article ID is -> ${rows[0].id}`);
}

insert().catch(e => {
    console.error('\n❌ Failed to insert:', e);
    process.exit(1);
});
