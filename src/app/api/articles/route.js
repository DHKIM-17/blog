import { put } from '@vercel/blob'
import { articleDb } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function POST(request) {
  // 인증 확인
  const session = await getSession()
  if (!session?.isAdmin) {
    return Response.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const formData = await request.formData()
  const title = formData.get('title')
  const content = formData.get('content')
  const images = formData.getAll('images')
  const createdAtStr = formData.get('createdAt')

  if (!title || !content) {
    return Response.json({ error: '제목과 본문은 필수입니다.' }, { status: 400 })
  }

  try {
    const imageUrls = []
    let thumbnailUrl = formData.get('thumbnailUrl') || null

    // 다중 이미지 처리 (파일 또는 URL 문자열 모두 지원)
    for (let i = 0; i < images.length; i++) {
      const image = images[i]
      if (typeof image === 'string' && image.length > 0) {
        // 이미 업로드된 이미지 URL
        imageUrls.push(image)
      } else if (image && typeof image !== 'string' && image.size > 0) {
        // 파일 직접 업로드 -> Vercel Blob으로! 클러스터링 방지 고유 파일명 생성
        const timestamp = Date.now()
        const originalName = image.name || 'article.png'
        const fileName = `${timestamp}-${originalName}`
        
        const blob = await put(fileName, image, { access: 'public' })
        imageUrls.push(blob.url)
        
        // 썸네일이 아직 지정되지 않았다면 첫 번째 업로드 파일을 지정
        if (!thumbnailUrl) {
          thumbnailUrl = blob.url
        }
      }
    }

    // 썸네일이 여전히 없으면 첫 번째 리스트 이미지 사용
    if (!thumbnailUrl && imageUrls.length > 0) {
      thumbnailUrl = imageUrls[0]
    }

    const createdAt = createdAtStr ? new Date(createdAtStr).toISOString() : null

    const article = await articleDb.create({ 
      title, 
      content, 
      thumbnailUrl, 
      images: imageUrls, 
      createdAt 
    })

    return Response.json({ article })
  } catch (err) {
    console.error('Article Create Error:', err)
    return Response.json({ error: `글 작성 서버 오류: ${err.message}` }, { status: 500 })
  }
}

export async function GET() {
  const articles = await articleDb.findMany()
  return Response.json({ articles })
}
