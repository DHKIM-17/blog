import { put } from '@vercel/blob'
import { photoDb } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function POST(request) {
  // 인증 확인
  const session = await getSession()
  if (!session?.isAdmin) {
    return Response.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('image')
  const title = formData.get('title') || null
  const description = formData.get('description') || null

  try {
    if (!file || typeof file === 'string') {
      return Response.json({ error: '이미지 파일이 필요합니다.' }, { status: 400 })
    }

    // 파일명 생성 및 보정 (이름이 없거나 중복 방지)
    const timestamp = Date.now()
    const originalName = file.name || 'photo.png'
    const fileName = `${timestamp}-${originalName}`

    // Vercel Blob에 업로드
    const blob = await put(fileName, file, { access: 'public' })
    const imageUrl = blob.url

    const createdAtStr = formData.get('createdAt')
    const createdAt = createdAtStr ? new Date(createdAtStr).toISOString() : null

    const photo = await photoDb.create({ title, description, imageUrl, createdAt })

    return Response.json({ photo })
  } catch (err) {
    console.error('Photo Upload Error:', err)
    return Response.json({ error: `갤러리 업로드 서버 오류: ${err.message}` }, { status: 500 })
  }
}

export async function GET() {
  const photos = await photoDb.findMany()
  return Response.json({ photos })
}
