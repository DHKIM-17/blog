'use client'

import { useState } from 'react'
import Link from 'next/link'

function formatDate(dateStr) {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '날짜 정보 없음'
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

export default function ArticlesClient({ initialArticles }) {
  const [activeCategory, setActiveCategory] = useState('전체')
  const categories = ['전체', '여행', '영화', '잡담']

  const filteredArticles = activeCategory === '전체'
    ? initialArticles
    : initialArticles.filter(a => a.category === activeCategory)

  return (
    <div className="articles-container">
      <nav className="category-filter">
        {categories.map(cat => (
          <button 
            key={cat} 
            className={`filter-btn ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </nav>

      <section className="articles-grid">
        {filteredArticles.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✎</div>
            <h3>이 분류에는 아직 작성된 글이 없습니다.</h3>
            <p>다른 카테고리를 선택하거나 새로운 이야기를 들려주세요.</p>
          </div>
        ) : (
          filteredArticles.map((article) => (
            <Link key={article.id} href={`/articles/${article.id}`} className="article-card">
              <div className="article-card-thumb">
                {article.thumbnailUrl ? (
                  <img src={article.thumbnailUrl} alt={article.title} />
                ) : (
                  <div className="skeleton" style={{ width: '100%', height: '100%' }}></div>
                )}
                <span className="article-category-badge">{article.category || '잡담'}</span>
              </div>
              <div className="article-card-info">
                <span className="article-card-date">{formatDate(article.createdAt)}</span>
                <h2 className="article-card-title">{article.title}</h2>
              </div>
            </Link>
          ))
        )}
      </section>
    </div>
  )
}
