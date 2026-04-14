const { sql } = require('@vercel/postgres');
const path = require('path');

// 로컬 .env 파일을 읽어오기 위해 환경 변수가 필요한 경우를 대비해 
// 직접 쿼리를 실행하는 로직입니다.
async function migrate() {
  console.log('🚀 데이터베이스 구조 업데이트를 시작합니다...');
  
  try {
    // Article 테이블에 category 컬럼 추가 (이미 있으면 무시되도록 try-catch 사용)
    await sql`ALTER TABLE Article ADD COLUMN category TEXT DEFAULT '잡담';`;
    console.log('✅ Article 테이블에 "category" 컬럼이 성공적으로 추가되었습니다!');
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️ "category" 컬럼이 이미 존재합니다. 작업을 건너뜁니다.');
    } else {
      console.error('❌ 오류 발생:', error.message);
      console.log('\n💡 힌트: 터미널에 POSTGRES_URL 환경 변수가 설정되어 있는지 확인해 주세요.');
    }
  }
}

migrate();
