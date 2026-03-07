/**
 * Auth proxy - runs before any page renders.
 * Redirects unauthenticated users to /sign-in with no flash of protected content.
 * Public routes: /, /sign-in only.
 */

import { NextResponse } from "next/server";

const AUTH_COOKIE = "auth_token";

const PUBLIC_PATHS = ["/", "/sign-in"];

function isPublicPath(pathname) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function proxy(request) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    const token = request.cookies.get(AUTH_COOKIE)?.value;
    if (token) {
      if (pathname === "/sign-in") return NextResponse.redirect(new URL("/home", request.url));
      if (pathname === "/") return NextResponse.redirect(new URL("/home", request.url));
    }
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token || token.trim() === "") {
    const signIn = new URL("/sign-in", request.url);
    signIn.searchParams.set("from", pathname);
    return NextResponse.redirect(signIn);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
