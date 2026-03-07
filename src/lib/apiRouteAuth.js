/**
 * API route auth - require valid token for protected API routes.
 * Checks x-access-token header first, then auth_token cookie.
 */

import { NextResponse } from "next/server";

const AUTH_COOKIE = "auth_token";

export function getTokenFromRequest(request) {
  const headerToken = request.headers.get("x-access-token")?.trim();
  if (headerToken) return headerToken;

  const cookieToken = request.cookies.get(AUTH_COOKIE)?.value?.trim();
  if (cookieToken) return cookieToken;

  return null;
}

export function requireAuth(request) {
  const token = getTokenFromRequest(request);
  if (!token) {
    return {
      unauthorized: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      ),
    };
  }
  return { token };
}
