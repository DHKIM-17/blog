const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(process.cwd(), 'prisma', 'dev.db'));
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables);
try {
  const rows = db.prepare("SELECT id, title, thumbnailUrl, images FROM articles ORDER BY id DESC LIMIT 5").all();
  rows.forEach(r => console.log(JSON.stringify(r)));
} catch(e) {
  console.log('articles table error:', e.message);
  try {
    const rows = db.prepare("SELECT id, title, thumbnailUrl, images FROM Article ORDER BY id DESC LIMIT 5").all();
    rows.forEach(r => console.log(JSON.stringify(r)));
  } catch(e2) {
    console.log('Article table error:', e2.message);
  }
}
