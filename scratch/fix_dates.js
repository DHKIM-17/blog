const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const db = new Database(dbPath);

const now = new Date().toISOString();

// Article 날짜 복구
const articles = db.prepare('SELECT id, createdAt FROM Article').all();
for (const a of articles) {
  if (a.createdAt.startsWith('+')) {
    console.log(`Fixing Article ID ${a.id}: ${a.createdAt} -> ${now}`);
    db.prepare('UPDATE Article SET createdAt = ? WHERE id = ?').run(now, a.id);
  }
}

// Photo 날짜 복구
const photos = db.prepare('SELECT id, createdAt FROM Photo').all();
for (const p of photos) {
  if (p.createdAt.startsWith('+')) {
    console.log(`Fixing Photo ID ${p.id}: ${p.createdAt} -> ${now}`);
    db.prepare('UPDATE Photo SET createdAt = ? WHERE id = ?').run(now, p.id);
  }
}

console.log('Recovery complete.');
