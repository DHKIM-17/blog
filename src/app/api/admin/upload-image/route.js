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

    // Vercel Blob에 업로드
    const blob = await put(file.name, file, { access: 'public' })
    
    return Response.json({ url: blob.url })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
