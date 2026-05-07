import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

// AWS S3 클라이언트 설정 (Cloudflare R2 호환)
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT, // ex: https://<ACCOUNT_ID>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export async function POST(request) {
  try {
    // 1. 관리자 세션 체크
    const session = await getSession();
    if (!session?.isAdmin) {
      return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 401 });
    }

    // 2. 환경변수 체크
    if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME || !process.env.R2_PUBLIC_URL) {
      const msg = '❌ [Error] R2 관련 환경 변수(.env)가 설정되지 않았습니다.';
      console.error(msg);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const { filename, contentType } = await request.json();
    if (!filename) {
      return NextResponse.json({ error: '파일 이름이 없습니다.' }, { status: 400 });
    }

    // 파일명 중복 방지를 위한 난수 추가 및 한글/공백 처리
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    // 한글이나 특수문자가 포함된 경우를 대비해 URL 인코딩 처리
    const safeFilename = encodeURIComponent(filename.replace(/\s+/g, '_'));
    const objectKey = `uploads/${timestamp}-${randomStr}-${safeFilename}`;

    // 3. Presigned URL 생성 (만료시간 1시간)
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: objectKey,
      ContentType: contentType || 'application/octet-stream',
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    // 4. 최종적으로 접근 가능할 공개 URL 조합
    const publicUrl = `${process.env.R2_PUBLIC_URL.replace(/\/$/, '')}/${objectKey}`;

    return NextResponse.json({ uploadUrl: presignedUrl, publicUrl });
  } catch (error) {
    console.error('❌ [R2 Presign Error]:', error);
    return NextResponse.json(
      { error: '업로드 URL 생성 실패: ' + error.message },
      { status: 500 }
    );
  }
}
