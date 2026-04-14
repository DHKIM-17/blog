import { articleDb } from '@/lib/db'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function formatDate(dateStr) {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '날짜 정보 없음'
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

export default async function ArticleDetailPage({ params }) {
  const { id } = await params
  const article = await articleDb.findOne(parseInt(id))

  if (!article) {
    notFound()
  }


  return (
    <article className="article-detail-container">
      <header className="article-detail-header">
        <Link href="/articles" className="hero-label">← Back to Articles</Link>
        <h1 className="article-detail-title">{article.title}</h1>
        <div className="article-detail-meta">
          <span className="detail-category">{article.category || '잡담'}</span>
          <span className="divider">|</span>
          <span>{formatDate(article.createdAt)}</span>
        </div>
      </header>


      <div className="article-detail-content prose">
        <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              img: ({node, ...props}) => <img {...props} style={{ maxWidth: '100%', height: 'auto', display: 'block', margin: '3rem auto', borderRadius: 'var(--radius)' }} />
            }}
        >
          {article.content}
        </ReactMarkdown>
      </div>


      <footer style={{ marginTop: '8rem', borderTop: '1px solid var(--border)', paddingTop: '4rem', textAlign: 'center' }}>
        <Link href="/articles" className="btn btn-ghost">목록으로 돌아가기</Link>
      </footer>
    </article>
  )
}
