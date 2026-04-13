import { photoDb, articleDb } from '@/lib/db'
import AdminDashboardClient from './AdminDashboardClient'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const photos = photoDb.findMany()
  const articles = articleDb.findMany()
  
  return <AdminDashboardClient initialPhotos={photos} initialArticles={articles} />
}
