import { photoDb, articleDb } from '@/lib/db'
import AdminDashboardClient from './AdminDashboardClient'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const photos = await photoDb.findMany()
  const articles = await articleDb.findMany()
  
  return <AdminDashboardClient initialPhotos={photos} initialArticles={articles} />
}
