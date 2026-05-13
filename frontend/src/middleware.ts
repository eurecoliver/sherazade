import createMiddleware from 'next-intl/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

function getLocale(pathname: string): string {
  const match = pathname.match(/^\/(it|en)(\/|$)/)
  return match ? match[1] : routing.defaultLocale
}

function isProtectedPath(pathname: string): boolean {
  return (
    pathname.includes('/dashboard/') ||
    /^\/(it|en)\/checkin(?:\/|$)/.test(pathname) ||
    /^\/(it|en)\/checkin-insegnanti(?:\/|$)/.test(pathname)
  )
}

export default function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  if (isProtectedPath(pathname)) {
    const accessToken = request.cookies.get('access_token')?.value
    if (!accessToken) {
      const locale = getLocale(pathname)
      const callbackUrl = pathname + search
      // Usa request.url (stringa raw) come base invece di request.nextUrl.clone()
      // per evitare il redirect loop con IP:porta in Next.js 14 standalone
      const loginUrl = new URL(request.url)
      loginUrl.pathname = `/${locale}/login`
      loginUrl.search = `?callbackUrl=${encodeURIComponent(callbackUrl)}`
      return NextResponse.redirect(loginUrl)
    }
  }

  return intlMiddleware(request)
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
