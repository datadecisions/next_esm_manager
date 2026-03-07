/**
 * Refresh proxy - exchanges refresh token for new access token.
 * Rate limited: 30 requests per minute per IP.
 */
import { NextResponse } from "next/server";
import { refreshLimiter } from "@/lib/rateLimit";

const BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";
const AUTH_COOKIE = "auth_token";
const REFRESH_COOKIE = "auth_refresh_token";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

function httpOnlyCookieOptions(secure) {
  return `path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${secure ? "; Secure" : ""}; HttpOnly`;
}

export async function POST(request) {
  const rateCheck = refreshLimiter.check(request);
  if (rateCheck.limited) {
    return NextResponse.json(
      {
        success: false,
        message: "Too many refresh requests. Please try again later.",
        retryAfter: rateCheck.retryAfter,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rateCheck.retryAfter ?? 60) },
      }
    );
  }

  if (!BASE) {
    return NextResponse.json(
      { success: false, message: "API URL not configured" },
      { status: 500 }
    );
  }

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json(
      { success: false, message: "No refresh token" },
      { status: 401 }
    );
  }

  const res = await fetch(`${BASE}/api/v1/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data?.success || !data?.token) {
    const clear = NextResponse.json(
      { success: false, message: data?.message || "Session expired" },
      { status: 401 }
    );
    clear.headers.append("Set-Cookie", `${AUTH_COOKIE}=; path=/; max-age=0`);
    clear.headers.append("Set-Cookie", `${REFRESH_COOKIE}=; path=/; max-age=0`);
    return clear;
  }

  const secure = request.url.startsWith("https:");
  const response = NextResponse.json({ success: true });

  response.headers.append(
    "Set-Cookie",
    `${AUTH_COOKIE}=${encodeURIComponent(data.token)}; ${httpOnlyCookieOptions(secure)}`
  );
  if (data.refreshToken) {
    response.headers.append(
      "Set-Cookie",
      `${REFRESH_COOKIE}=${encodeURIComponent(data.refreshToken)}; ${httpOnlyCookieOptions(secure)}`
    );
  }

  return response;
}
