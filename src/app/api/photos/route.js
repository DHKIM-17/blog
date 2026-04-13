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

  if (!file || typeof file === 'string') {
    return Response.json({ error: '이미지 파일이 필요합니다.' }, { status: 400 })
  }

  // Vercel Blob에 업로드
  const blob = await put(file.name, file, { access: 'public' })
  const imageUrl = blob.url

  const createdAtStr = formData.get('createdAt')
  const createdAt = createdAtStr ? new Date(createdAtStr).toISOString() : null

  const photo = await photoDb.create({ title, description, imageUrl, createdAt })

  return Response.json({ photo })
}

export async function GET() {
  const photos = await photoDb.findMany()
  return Response.json({ photos })
}
