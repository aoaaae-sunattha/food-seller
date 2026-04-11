export { default } from 'next-auth/middleware'

export const config = {
  matcher: ['/((?!api/auth|api/line|_next/static|_next/image|favicon.ico).*)'],
}
