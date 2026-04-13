import { del } from '@vercel/blob'
import { photoDb } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function DELETE(request, { params }) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return Response.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { id } = await params
  const photoId = parseInt(id)

  const photo = await photoDb.findOne(photoId)
  if (!photo) {
    return Response.json({ error: '사진을 찾을 수 없습니다.' }, { status: 404 })
  }

  // Vercel Blob 삭제 시도
  if (photo.imageUrl && photo.imageUrl.includes('public.blob.vercel-storage.com')) {
    try {
      await del(photo.imageUrl)
    } catch (err) {
      console.error('Blob 삭제 오류:', err)
    }
  }

  await photoDb.delete(photoId)
  return Response.json({ ok: true })
}

export async function PATCH(request, { params }) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return Response.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { id } = await params
  const photoId = parseInt(id)
  const { title, description, createdAt } = await request.json()

  const photo = await photoDb.update(photoId, { title, description, createdAt })

  return Response.json({ photo })
}
