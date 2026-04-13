import { put, del } from '@vercel/blob'
import { articleDb } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET(request, { params }) {
  const { id } = await params
  const article = await articleDb.findOne(parseInt(id))
  
  if (!article) {
    return Response.json({ error: '글을 찾을 수 없습니다.' }, { status: 404 })
  }
  
  return Response.json({ article })
}

export async function DELETE(request, { params }) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return Response.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { id } = await params
  const articleId = parseInt(id)

  const article = await articleDb.findOne(articleId)
  if (!article) {
    return Response.json({ error: '글을 찾을 수 없습니다.' }, { status: 404 })
  }

  /**
   * Vercel Blob 삭제 (선택 사항)
   * 실제 운영 환경에서는 사진이 다른 글에서도 쓰일 수 있으므로 신중해야 하지만,
   * 여기서는 해당 글에 귀속된 사진들이 있다면 삭제를 시도합니다.
   */
  const allImages = article.images || []
  if (article.thumbnailUrl && !allImages.includes(article.thumbnailUrl)) {
    allImages.push(article.thumbnailUrl)
  }

  for (const imgUrl of allImages) {
    if (imgUrl.includes('public.blob.vercel-storage.com')) {
      try {
        await del(imgUrl)
      } catch (err) {
        console.error('Blob 삭제 오류:', err)
      }
    }
  }

  await articleDb.delete(articleId)
  return Response.json({ ok: true })
}

export async function PATCH(request, { params }) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return Response.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { id } = await params
  const articleId = parseInt(id)
  
  const formData = await request.formData()
  const title = formData.get('title')
  const content = formData.get('content')
  const newImages = formData.getAll('images')
  const existingThumbnailUrl = formData.get('existingThumbnailUrl')
  const createdAt = formData.get('createdAt')

  const existingArticle = await articleDb.findOne(articleId)
  if (!existingArticle) {
    return Response.json({ error: '글을 찾을 수 없습니다.' }, { status: 404 })
  }

  let imageUrls = [...(existingArticle.images || [])]
  let thumbnailUrl = existingThumbnailUrl || existingArticle.thumbnailUrl

  // 새 이미지들이 업로드된 경우 Vercel Blob에 저장
  for (let i = 0; i < newImages.length; i++) {
    const image = newImages[i]
    if (image && typeof image !== 'string' && image.size > 0) {
      const blob = await put(image.name, image, { access: 'public' })
      imageUrls.push(blob.url)
    } else if (typeof image === 'string' && image.length > 0) {
      // 이미 URL로 전달된 경우 (중복 방지용)
      if (!imageUrls.includes(image)) imageUrls.push(image)
    }
  }

  const updatedArticle = await articleDb.update(articleId, {
    title: title || existingArticle.title,
    content: content || existingArticle.content,
    thumbnailUrl,
    images: imageUrls,
    createdAt: createdAt || existingArticle.createdAt
  })

  return Response.json({ article: updatedArticle })
}
