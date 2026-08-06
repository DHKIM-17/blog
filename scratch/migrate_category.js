const { sql } = require('@vercel/postgres');
require('dotenv').config();

async function migrate() {
  console.log('마이그레이션 시작: Article 테이블에 category 컬럼 추가...');
  try {
    const result = await sql`ALTER TABLE Article ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '잡담'`;
    console.log('성공:', result);
  } catch (error) {
    console.error('실패:', error);
  } finally {
    process.exit();
  }
}

migrate();
