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
  const thumbnailUrlParam = formData.get('thumbnailUrl')
  const createdAt = formData.get('createdAt')
  const category = formData.get('category')

  const existingArticle = await articleDb.findOne(articleId)
  if (!existingArticle) {
    return Response.json({ error: '글을 찾을 수 없습니다.' }, { status: 404 })
  }

  // [v1.2.1 Bugfix] 클라이언트에서 전달받은 이미지 목록으로 완전히 덮어써서 개별 삭제를 반영
  let imageUrls = []

  // 새 이미지 또는 유지되는 기존 이미지 수집
  for (let i = 0; i < newImages.length; i++) {
    const image = newImages[i]
    if (image && typeof image !== 'string' && image.size > 0) {
      const blob = await put(image.name, image, { access: 'public' })
      imageUrls.push(blob.url)
    } else if (typeof image === 'string' && image.length > 0) {
      imageUrls.push(image)
    }
  }

  // 서버에 저장될 대표 사진도 클라이언트가 명시한 값으로 강제 업데이트
  let thumbnailUrl = thumbnailUrlParam || null

  const updatedArticle = await articleDb.update(articleId, {
    title: title || existingArticle.title,
    content: content || existingArticle.content,
    thumbnailUrl,
    images: imageUrls,
    createdAt: createdAt || existingArticle.createdAt,
    category: category || existingArticle.category
  })

  return Response.json({ article: updatedArticle })
}
