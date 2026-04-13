const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const db = new Database(dbPath);

try {
  db.exec('ALTER TABLE Article ADD COLUMN images TEXT;');
  console.log('Column "images" added to Article table.');
} catch (err) {
  if (err.message.includes('duplicate column name')) {
    console.log('Column "images" already exists.');
  } else {
    throw err;
  }
}
