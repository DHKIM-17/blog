import { handleUpload } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function POST(request) {
  const body = await request.json();

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // 1. 관리자 세션 체크 (필수!)
        const session = await getSession();
        if (!session?.isAdmin) {
          throw new Error('본 세션은 관리자 권한이 없습니다.');
        }

        // 2. 업로드 토큰 생성 및 설정 반환
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
          tokenPayload: JSON.stringify({
            userId: session.id, // 추후 관리를 위한 유저 ID 포함
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // 3. 업로드 완료 후 후속 작업 (필요 시 DB 기록 등)
        console.log('Blob upload completed:', blob.url);

        try {
          const { userId } = JSON.parse(tokenPayload);
          // 예: 유저의 업로드 로그를 남기거나 하는 로직 추가 가능
        } catch (error) {
          console.error('onUploadCompleted error:', error);
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }, // 서버 오류 대신 클라이언트 오류(권한 등)로 처리
    );
  }
}
