import { sql } from '@vercel/postgres'
import { getSession } from '@/lib/session'

export async function GET() {
  // 보안을 위해 관리자 세션 확인 (필요 시 주석 처리하여 강제 진단 가능)
  const session = await getSession()
  if (!session?.isAdmin) {
    return Response.json({ error: '인증이 필요합니다. 관리자 로그인 후 다시 시도해 주세요.' }, { status: 401 })
  }

  try {
    console.log('--- DB 진단 시작 ---')
    
    // 1. 모든 테이블 목록 조회
    const { rows: tables } = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `
    
    // 2. Article 또는 article 테이블의 컬럼 정보 조회
    const { rows: columns } = await sql`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name ILIKE 'article'
    `

    console.log('--- DB 진단 완료 ---')

    return Response.json({
      message: "데이터베이스 구조 진단 결과입니다.",
      tables: tables.map(t => t.table_name),
      articleColumns: columns,
      tip: "위 목록에 'category' 컬럼이 없다면, 제가 드리는 특수 쿼리를 실행해야 합니다."
    })
  } catch (err) {
    console.error('Diagnostic Error:', err)
    return Response.json({ 
      error: `진단 중 서버 오류 발생: ${err.message}`,
      env: process.env.POSTGRES_URL ? 'POSTGRES_URL 설정됨' : 'POSTGRES_URL 누락됨'
    }, { status: 500 })
  }
}
