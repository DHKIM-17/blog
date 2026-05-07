import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('[v1.0.2] DB 스키마 정밀 수리 시작...');
    
    // 1. Article 테이블에 category 컬럼 추가 (없을 경우에만)
    await sql`ALTER TABLE Article ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '잡담'`;
    console.log(' - Article 테이블 category 컬럼 추가 완료');

    // 2. 다른 컬럼들도 혹시 모르니 체크 (필요 시 추가 가능)
    
    return NextResponse.json({ 
      success: true, 
      message: '데이터베이스 스키마 수리가 완료되었습니다. 이제 글 작성이 가능할 것입니다.',
      version: 'v1.0.2'
    });
  } catch (error) {
    console.error('스키마 수리 실패:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
