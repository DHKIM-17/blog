import { articleDb } from '@/lib/db'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function formatDate(dateStr) {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '날짜 정보 없음'
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

export default async function ArticlesPage() {
  const articles = await articleDb.findMany()

  return (
    <div className="articles-page">
      <header className="articles-header">
        <h1 className="articles-title">Articles</h1>
      </header>

      <section className="articles-grid">
        {articles.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✎</div>
            <h3>아직 작성된 글이 없습니다.</h3>
            <p>관리자 페이지에서 첫 번째 이야기를 들려주세요.</p>
          </div>
        ) : (
          articles.map((article) => (
            <Link key={article.id} href={`/articles/${article.id}`} className="article-card">
              <div className="article-card-thumb">
                {article.thumbnailUrl ? (
                  <img src={article.thumbnailUrl} alt={article.title} />
                ) : (
                  <div className="skeleton" style={{ width: '100%', height: '100%' }}></div>
                )}
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
