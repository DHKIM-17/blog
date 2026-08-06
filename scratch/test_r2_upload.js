const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');


const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function test() {
  try {
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: 'test-upload.txt',
      ContentType: 'text/plain',
    });
    
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    console.log('Presigned URL generated:', url);

    // Test upload from Node (no CORS)
    const res = await fetch(url, {
      method: 'PUT',
      body: 'Hello World',
      headers: { 'Content-Type': 'text/plain' }
    });
    console.log('Upload status:', res.status);
    console.log('Upload ok:', res.ok);
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
