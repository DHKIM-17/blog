import Link from 'next/link'
import { Playfair_Display, Noto_Serif_KR } from 'next/font/google'
import { getSession } from '@/lib/session'
import AdminBanner from './AdminBanner'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-serif-en',
})

const notoSerifKr = Noto_Serif_KR({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-serif-kr',
})

export const metadata = {
  title: '📌 — 일상의 순간들',
  description: '디지털 카메라로 담은 여행과 일상의 기록',
}

export default async function RootLayout({ children }) {
  const session = await getSession()
  const isAdmin = session?.isAdmin
  return (
    <html lang="ko" className={`${playfair.variable} ${notoSerifKr.variable}`}>
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
