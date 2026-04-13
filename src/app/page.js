import { photoDb } from '@/lib/db'
import GalleryClient from './GalleryClient'

export default async function HomePage() {
  const photos = await photoDb.findMany()
  return <GalleryClient photos={photos} />
}
