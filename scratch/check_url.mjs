import fs from 'fs';
import { sql } from '@vercel/postgres';

try {
  const parseEnv = (filePath) => {
    try {
      const envFile = fs.readFileSync(filePath, 'utf8');
      envFile.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)="?(.*?)"?$/);
        if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
      });
    } catch(e) {}
  };
  parseEnv('../.env');
  parseEnv('../.env.development.local');
} catch(e) {}

async function check() {
  const { rows } = await sql`SELECT content FROM Article WHERE id = 23`;
  const article = rows[0];
  const brokenPattern = /https:\/\/[a-zA-Z0-9-.]*pstatic\.net[^\s"()\]]*/g;
  let matches = article.content.match(brokenPattern) || [];
  console.log('Matches array:', matches.slice(0, 5));
  process.exit(0);
}
check();
