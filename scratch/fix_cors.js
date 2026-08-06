const { S3Client, PutBucketCorsCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function setCors() {
  const command = new PutBucketCorsCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
          AllowedOrigins: ['*'],
          ExposeHeaders: ['ETag'],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  });

  try {
    const response = await s3Client.send(command);
    console.log('CORS configured successfully:', response);
  } catch (error) {
    console.error('Error configuring CORS:', error);
  }
}

setCors();
