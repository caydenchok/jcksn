import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PREFIXES = ['/p', '/data', '/_next', '/favicon', '/robots.txt', '/sitemap.xml', '/icon']

export function middleware(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_MODE !== 'public') {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl

  if (PUBLIC_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  return new NextResponse(null, { status: 404 })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image).*)',
  ],
}
