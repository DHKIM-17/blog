import { articleDb } from '@/lib/db'
import ArticlesClient from './ArticlesClient'

export const dynamic = 'force-dynamic'

export default async function ArticlesPage() {
  const articles = await articleDb.findMany()

  return (
    <div className="articles-page">
      <header className="articles-header">
        <h1 className="articles-title">Articles</h1>
      </header>

      <ArticlesClient initialArticles={articles} />
    </div>
  )
}
