import fs from 'fs';
import { sql } from '@vercel/postgres';

// Load .env.development.local to get POSTGRES_URL
try {
  const envContent = fs.readFileSync('.env.development.local', 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)="?(.*?)"?$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  });
} catch(e) {
  console.error("No .env.development.local found");
}

async function migrate() {
  const localDb = JSON.parse(fs.readFileSync('scratch/local_db.json', 'utf8'));
  
  // Get the latest unique 3 articles we just migrated
  const titles = [
    "23.12 씨네큐브광화문 하마구치 류스케 감독 <해피 아워> GV/디카",
    "24.05 도쿄 / 디카",
    "23.11 성균관대의 가을/디카"
  ];
  
  for (const title of titles) {
    // Find the LAST occurrence in localDb (which has the correct R2 images)
    const articles = localDb.articles.filter(a => a.title === title);
    if (articles.length === 0) continue;
    const article = articles[articles.length - 1]; // get the latest successful one
    
    console.log("Pushing to Postgres:", article.title);
    const imagesJson = JSON.stringify(article.images);
    
    await sql`
      INSERT INTO Article (title, content, "thumbnailUrl", images, category, "createdAt", "updatedAt") 
      VALUES (${article.title}, ${article.content}, ${article.thumbnailUrl}, ${imagesJson}, ${article.category}, ${article.createdAt}, ${article.updatedAt}) 
    `;
    console.log("✅ Done:", article.title);
  }
  
  console.log("🎉 All posts have been successfully pushed to the live database!");
  process.exit(0);
}

migrate();
