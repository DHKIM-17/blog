import fs from 'fs';
import { list } from '@vercel/blob';

try {
  const envFile = fs.readFileSync('../.env', 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)="?(.*?)"?$/);
    if (match) {
      if (!process.env[match[1]]) process.env[match[1]] = match[2];
    }
  });
} catch(e) {}

async function checkUsage() {
    let hasMore = true;
    let cursor = undefined;
    let totalSize = 0;
    let fileCount = 0;

    console.log("Vercel 클라우드 파일 리스트 스캔 중...");
    
    while (hasMore) {
        const result = await list({
            token: process.env.BLOB_READ_WRITE_TOKEN,
            cursor: cursor,
            limit: 1000,
        });

        for (const blob of result.blobs) {
            totalSize += blob.size;
            fileCount++;
        }

        hasMore = result.hasMore;
        cursor = result.cursor;
    }

    const totalMb = (totalSize / (1024 * 1024)).toFixed(2);
    const limitMb = 250;
    const percentage = ((totalMb / limitMb) * 100).toFixed(2);
    
    console.log(`\n=== Vercel Blob Storage Usage ===`);
    console.log(`총 파일 개수: ${fileCount}장`);
    console.log(`사용 중인 용량: ${totalMb} MB`);
    console.log(`사용률: ${percentage}% (최대 250 MB 기준)`);
    console.log(`남은 용량: ${(limitMb - totalMb).toFixed(2)} MB`);
}

checkUsage();
