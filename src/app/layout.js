import Link from 'next/link'
import { getSession } from '@/lib/session'
import AdminBanner from './AdminBanner'
import './globals.css'

export const metadata = {
  title: '🦦 — 일상의 순간들',
  description: '디지털 카메라로 담은 여행과 일상의 기록',
}

export default async function RootLayout({ children }) {
  const session = await getSession()
  const isAdmin = session?.isAdmin
  return (
    <html lang="ko">
      <body className="antialiased">
        <AdminBanner isAdmin={isAdmin} />
        <header className="global-header">
          <div className="header-container">
            <Link href="/" className="site-logo">
              🦦
            </Link>
            <nav className="site-nav">
              <Link href="/" className="nav-link">Gallery</Link>
              <Link href="/articles" className="nav-link">Articles</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="global-footer">
          <p>© 2026 🦦 — All Rights Reserved</p>
        </footer>
      </body>
    </html>
  )
}
