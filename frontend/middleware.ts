import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/selecionar-loja', '/esqueci-a-senha', '/redefinir-senha'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  // Zustand persist salva no cookie/localStorage com a chave "filmpro-auth"
  // No middleware do Next.js só temos acesso a cookies — usamos um cookie de sessão
  const authCookie = request.cookies.get('filmpro-auth-token');

  if (!authCookie?.value) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
