import { put } from '@vercel/blob'
import { getSession } from '@/lib/session'

export async function POST(request) {
  // 인증 확인
  const session = await getSession()
  if (!session?.isAdmin) {
    return Response.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('image')

    if (!file || typeof file === 'string') {
      return Response.json({ error: '파일이 없습니다.' }, { status:400 })
    }

    // 파일명 생성 및 보정 (이름이 없거나 중복 방지)
    const timestamp = Date.now()
    const originalName = file.name || 'image.png'
    const fileName = `${timestamp}-${originalName}`

    // Vercel Blob에 업로드
    const blob = await put(fileName, file, { access: 'public' })
    
    return Response.json({ url: blob.url })
  } catch (err) {
    console.error('Upload Error:', err)
    return Response.json({ error: `업로드 서버 오류: ${err.message}` }, { status: 500 })
  }
}
