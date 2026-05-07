import { sql as vercelSql } from '@vercel/postgres'
import fs from 'node:fs'
import path from 'node:path'

// [v1.0.6] 하이브리드 DB 엔진: 접속 정보가 없을 때 로컬 파일 저장소 사용
const isPostgresConfigured = !!process.env.POSTGRES_URL;
const LOCAL_DB_PATH = path.join(process.cwd(), 'scratch', 'local_db.json');

// 로컬 DB 헬퍼 (파일이 없으면 생성)
function getLocalData() {
  try {
    if (!fs.existsSync(path.dirname(LOCAL_DB_PATH))) {
      fs.mkdirSync(path.dirname(LOCAL_DB_PATH), { recursive: true });
    }
    if (!fs.existsSync(LOCAL_DB_PATH)) {
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify({ photos: [], articles: [] }, null, 2));
    }
    const data = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Local DB Read Error:', err);
    return { photos: [], articles: [] };
  }
}

function saveLocalData(data) {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Local DB Write Error:', err);
  }
}

const sql = async (...args) => {
  if (!isPostgresConfigured) {
    console.warn('⚠️ [DB 로컬 모드] POSTGRES_URL이 없어 로컬 파일에 저장합니다.');
    return null; // 로컬 모드에서는 이 sql 함수 대신 아래 개별 DB 로직에서 처리됨
  }
  try {
    return await vercelSql(...args);
  } catch (err) {
    console.error('❌ [DB Error] SQL 실행 오류:', err.message);
    throw err;
  }
};

// Photo CRUD 유틸리티
export const photoDb = {
  findMany: async () => {
    if (!isPostgresConfigured) return getLocalData().photos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const { rows } = await sql`SELECT * FROM Photo ORDER BY "createdAt" DESC`
    return rows
  },
  findOne: async (id) => {
    if (!isPostgresConfigured) return getLocalData().photos.find(p => p.id === id || p.id === Number(id)) || null;
    const { rows } = await sql`SELECT * FROM Photo WHERE id = ${id}`
    return rows[0] || null
  },
  create: async ({ title, description, imageUrl, createdAt }) => {
    const now = createdAt || new Date().toISOString()
    if (!isPostgresConfigured) {
      const data = getLocalData();
      const newPhoto = { id: Date.now(), title, description, imageUrl, createdAt: now };
      data.photos.push(newPhoto);
      saveLocalData(data);
      return newPhoto;
    }
    const { rows } = await sql`
      INSERT INTO Photo (title, description, "imageUrl", "createdAt") 
      VALUES (${title}, ${description}, ${imageUrl}, ${now}) 
      RETURNING *
    `
    return rows[0]
  },
  update: async (id, { title, description, createdAt }) => {
    if (!isPostgresConfigured) {
      const data = getLocalData();
      const idx = data.photos.findIndex(p => p.id === id || p.id === Number(id));
      if (idx === -1) return null;
      data.photos[idx] = { ...data.photos[idx], title, description, createdAt: createdAt || data.photos[idx].createdAt };
      saveLocalData(data);
      return data.photos[idx];
    }
    const { rows } = await sql`
      UPDATE Photo 
      SET title = COALESCE(${title}, title), 
          description = COALESCE(${description}, description), 
          "createdAt" = COALESCE(${createdAt}, "createdAt") 
      WHERE id = ${id} 
      RETURNING *
    `
    return rows[0]
  },
  delete: async (id) => {
    if (!isPostgresConfigured) {
      const data = getLocalData();
      const idx = data.photos.findIndex(p => p.id === id || p.id === Number(id));
      if (idx === -1) return null;
      const deleted = data.photos.splice(idx, 1)[0];
      saveLocalData(data);
      return deleted;
    }
    const { rows } = await sql`DELETE FROM Photo WHERE id = ${id} RETURNING *`
    return rows[0]
  },
}

// Article CRUD 유틸리티
export const articleDb = {
  findMany: async () => {
    if (!isPostgresConfigured) return getLocalData().articles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const { rows } = await sql`SELECT * FROM Article ORDER BY "createdAt" DESC`
    return rows.map(a => {
      let parsedImages = []
      try {
        parsedImages = typeof a.images === 'string' ? JSON.parse(a.images) : (a.images || [])
      } catch (e) { console.error('Image parsing error:', e) }
      return { ...a, images: parsedImages, category: a.category || '잡담' }
    })
  },
  findOne: async (id) => {
    if (!isPostgresConfigured) return getLocalData().articles.find(a => a.id === id || a.id === Number(id)) || null;
    const { rows } = await sql`SELECT * FROM Article WHERE id = ${id}`
    const article = rows[0]
    if (!article) return null
    let parsedImages = []
    try {
      parsedImages = typeof article.images === 'string' ? JSON.parse(article.images) : (article.images || [])
    } catch (e) { console.error('Image parsing error:', e) }
    return { ...article, images: parsedImages, category: article.category || '잡담' }
  },
  create: async ({ title, content, thumbnailUrl, images, createdAt, category }) => {
    const now = createdAt || new Date().toISOString()
    const cat = category || '잡담'
    const imgs = images || []
    if (!isPostgresConfigured) {
      const data = getLocalData();
      const newArticle = { id: Date.now(), title, content, thumbnailUrl, images: imgs, category: cat, createdAt: now, updatedAt: now };
      data.articles.push(newArticle);
      saveLocalData(data);
      return newArticle;
    }
    const imagesJson = JSON.stringify(imgs)
    const { rows } = await sql`
      INSERT INTO Article (title, content, "thumbnailUrl", images, category, "createdAt", "updatedAt") 
      VALUES (${title}, ${content}, ${thumbnailUrl}, ${imagesJson}, ${cat}, ${now}, ${now}) 
      RETURNING *
    `
    const newArt = rows[0]
    return { ...newArt, images: imgs }
  },
  update: async (id, { title, content, thumbnailUrl, images, createdAt, category }) => {
    const now = new Date().toISOString()
    if (!isPostgresConfigured) {
      const data = getLocalData();
      const idx = data.articles.findIndex(a => a.id === id || a.id === Number(id));
      if (idx === -1) return null;
      data.articles[idx] = { 
        ...data.articles[idx], 
        title, content, thumbnailUrl, 
        images: images || data.articles[idx].images, 
        category: category || data.articles[idx].category,
        createdAt: createdAt || data.articles[idx].createdAt,
        updatedAt: now 
      };
      saveLocalData(data);
      return data.articles[idx];
    }
    const imagesJson = images ? JSON.stringify(images) : null
    const { rows } = await sql`
      UPDATE Article 
      SET title = COALESCE(${title}, title), 
          content = COALESCE(${content}, content), 
          "thumbnailUrl" = COALESCE(${thumbnailUrl}, "thumbnailUrl"), 
          images = COALESCE(${imagesJson}, images), 
          category = COALESCE(${category}, category),
          "createdAt" = COALESCE(${createdAt}, "createdAt"), 
          "updatedAt" = ${now} 
      WHERE id = ${id} 
      RETURNING *
    `
    return rows && rows.length > 0 ? articleDb.findOne(rows[0].id) : null;
  },
  delete: async (id) => {
    const article = await articleDb.findOne(id)
    if (!isPostgresConfigured) {
      const data = getLocalData();
      const idx = data.articles.findIndex(a => a.id === id || a.id === Number(id));
      if (idx !== -1) {
        data.articles.splice(idx, 1);
        saveLocalData(data);
      }
      return article;
    }
    if (article) await sql`DELETE FROM Article WHERE id = ${id}`;
    return article
  },
}

/**
 * 초기 테이블 생성 (Vercel Postgres 대시보드에서 실행하거나, 첫 실행 시 호출 필요)
 * SQL:
 * CREATE TABLE Photo (id SERIAL PRIMARY KEY, title TEXT, description TEXT, "imageUrl" TEXT NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
 * CREATE TABLE Article (id SERIAL PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL, "thumbnailUrl" TEXT, images JSONB, "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
 */
