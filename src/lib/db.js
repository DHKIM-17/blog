import { sql } from '@vercel/postgres'

// Photo CRUD 유틸리티 (비동기)
export const photoDb = {
  findMany: async () => {
    const { rows } = await sql`SELECT * FROM Photo ORDER BY "createdAt" DESC`
    return rows
  },
  findOne: async (id) => {
    const { rows } = await sql`SELECT * FROM Photo WHERE id = ${id}`
    return rows[0] || null
  },
  create: async ({ title, description, imageUrl, createdAt }) => {
    const now = createdAt || new Date().toISOString()
    const { rows } = await sql`
      INSERT INTO Photo (title, description, "imageUrl", "createdAt") 
      VALUES (${title}, ${description}, ${imageUrl}, ${now}) 
      RETURNING *
    `
    return rows[0]
  },
  update: async (id, { title, description, createdAt }) => {
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
    const { rows } = await sql`DELETE FROM Photo WHERE id = ${id} RETURNING *`
    return rows[0]
  },
}

// Article CRUD 유틸리티 (비동기)
export const articleDb = {
  findMany: async () => {
    const { rows } = await sql`SELECT * FROM Article ORDER BY "createdAt" DESC`
    return rows.map(a => {
      let parsedImages = []
      try {
        parsedImages = typeof a.images === 'string' ? JSON.parse(a.images) : (a.images || [])
      } catch (e) {
        console.error('Image parsing error:', e)
      }
      return { 
        ...a, 
        images: parsedImages,
        category: a.category || '잡담' // 데이터 정규화
      }
    })
  },
  findOne: async (id) => {
    const { rows } = await sql`SELECT * FROM Article WHERE id = ${id}`
    const article = rows[0]
    if (!article) return null
    
    let parsedImages = []
    try {
      parsedImages = typeof article.images === 'string' ? JSON.parse(article.images) : (article.images || [])
    } catch (e) {
      console.error('Image parsing error:', e)
    }
    
    return { 
      ...article, 
      images: parsedImages,
      category: article.category || '잡담' // 데이터 정규화
    }
  },
  create: async ({ title, content, thumbnailUrl, images, createdAt, category }) => {
    const now = createdAt || new Date().toISOString()
    const imagesJson = JSON.stringify(images || [])
    const cat = category || '잡담'
    const { rows } = await sql`
      INSERT INTO Article (title, content, "thumbnailUrl", images, category, "createdAt", "updatedAt") 
      VALUES (${title}, ${content}, ${thumbnailUrl}, ${imagesJson}, ${cat}, ${now}, ${now}) 
      RETURNING *
    `
    const newArticle = rows[0]
    
    // 즉시 파싱하여 반환 (추가 조회 없이)
    let parsedImages = []
    try {
      parsedImages = typeof newArticle.images === 'string' ? JSON.parse(newArticle.images) : (newArticle.images || [])
    } catch (e) {
      parsedImages = []
    }
    
    return { ...newArticle, images: parsedImages }
  },
  update: async (id, { title, content, thumbnailUrl, images, createdAt, category }) => {
    const now = new Date().toISOString()
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
    return articleDb.findOne(rows[0].id)
  },
  delete: async (id) => {
    const article = await articleDb.findOne(id)
    await sql`DELETE FROM Article WHERE id = ${id}`
    return article
  },
}

/**
 * 초기 테이블 생성 (Vercel Postgres 대시보드에서 실행하거나, 첫 실행 시 호출 필요)
 * SQL:
 * CREATE TABLE Photo (id SERIAL PRIMARY KEY, title TEXT, description TEXT, "imageUrl" TEXT NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
 * CREATE TABLE Article (id SERIAL PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL, "thumbnailUrl" TEXT, images JSONB, "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
 */
