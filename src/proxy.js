import { NextResponse } from 'next/server'
import { decrypt } from '@/lib/session'

export async function proxy(request) {
  const { pathname } = request.nextUrl

  // 관리자 페이지 보호 (/admin/login은 제외)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const session = request.cookies.get('session')?.value
    const payload = await decrypt(session)

    if (!payload?.isAdmin) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
