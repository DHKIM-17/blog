import { put } from '@vercel/blob'
import { photoDb } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function POST(request) {
  // 인증 확인
  const session = await getSession()
  if (!session?.isAdmin) {
    return Response.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  let imageUrl, title, description, createdAt;

  try {
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      // JSON 방식으로 온 경우 (클라이언트 직접 업로드 결과 처리)
      const body = await request.json();
      imageUrl = body.imageUrl;
      title = body.title;
      description = body.description;
      createdAt = body.createdAt;
    } else {
      // 기존 FormData 방식으로 온 경우 (작은 파일 등)
      const formData = await request.formData();
      const file = formData.get('image');
      title = formData.get('title') || null;
      description = formData.get('description') || null;
      const createdAtStr = formData.get('createdAt');
      createdAt = createdAtStr ? new Date(createdAtStr).toISOString() : null;

      if (!file || typeof file === 'string') {
        return Response.json({ error: '이미지 파일이 필요합니다.' }, { status: 400 });
      }

      // 서버에서 Blob에 직접 업로드 (4.5MB 제한 있음)
      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.name || 'photo.png'}`;
      const blob = await put(fileName, file, { access: 'public' });
      imageUrl = blob.url;
    }

    if (!imageUrl) {
      return Response.json({ error: '이미지 URL이 필요합니다.' }, { status: 400 });
    }

    const photo = await photoDb.create({ title, description, imageUrl, createdAt });
    return Response.json({ photo });
  } catch (err) {
    console.error('Photo Process Error:', err);
    return Response.json({ error: `갤러리 저장 서버 오류: ${err.message}` }, { status: 500 });
  }
}

export async function GET() {
  const photos = await photoDb.findMany()
  return Response.json({ photos })
}
