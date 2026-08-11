import Link from 'next/link'
import { Inter } from 'next/font/google'
import { getSession } from '@/lib/session'
import AdminBanner from './AdminBanner'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans-en',
})

export const metadata = {
  title: '📌 — 일상의 순간들',
  description: '디지털 카메라로 담은 여행과 일상의 기록',
}

export default async function RootLayout({ children }) {
  const session = await getSession()
  const isAdmin = session?.isAdmin
  return (
    <html lang="ko" className={inter.variable}>
      <body className="antialiased">
        <AdminBanner isAdmin={isAdmin} />
        <header className="global-header">
          <div className="header-container">
            <Link href="/" className="site-logo">
              📌 <span className="site-logo-text">일상의 기록</span>
            </Link>
            <nav className="site-nav">
              <Link href="/" className="nav-link">Gallery</Link>
              <Link href="/articles" className="nav-link">Articles</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="global-footer">
          <p>© 2026 📌 — All Rights Reserved</p>
        </footer>
      </body>
    </html>
  )
}
