/**
 * Login proxy - calls ESM backend, sets httpOnly cookies.
 * Client never sees the token (XSS-safe).
 * Rate limited: 5 attempts per 15 min per IP.
 */
import { NextResponse } from "next/server";
import { loginLimiter } from "@/lib/rateLimit";

const BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";
const AUTH_COOKIE = "auth_token";
const REFRESH_COOKIE = "auth_refresh_token";
const USER_COOKIE = "auth_user";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

function cookieOptions(secure) {
  return `path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${secure ? "; Secure" : ""}`;
}

function httpOnlyCookieOptions(secure) {
  return `${cookieOptions(secure)}; HttpOnly`;
}

export async function POST(request) {
  const rateCheck = loginLimiter.check(request);
  if (rateCheck.limited) {
    return NextResponse.json(
      {
        success: false,
        message: "Too many sign-in attempts. Please try again later.",
        retryAfter: rateCheck.retryAfter,
        attemptsRemaining: 0,
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

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request body" },
      { status: 400 }
    );
  }

  const username = body.username?.trim();
  const password = body.password;
  if (!username || !password) {
    return NextResponse.json(
      { success: false, message: "Username and password required" },
      { status: 400 }
    );
  }

  const url = `${BASE}/api/v1/authenticate`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username, password }).toString(),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data?.success || !data?.token) {
    return NextResponse.json(
      {
        success: false,
        message: data?.message || "Authentication failed",
        attemptsRemaining: rateCheck.remaining,
      },
      { status: res.status >= 400 ? res.status : 401 }
    );
  }

  loginLimiter.reset(request);

  const secure = request.url.startsWith("https:");
  const token = data.token;
  const refreshToken = data.refreshToken ?? null;

  const userPayload = {
    name: data.name ?? null,
    fullName: data.name ?? null,
    username: username,
  };

  const response = NextResponse.json({
    success: true,
    message: data.message,
    name: data.name,
    longName: data.longName,
    branch: data.branch,
    dept: data.dept,
  });

  response.headers.append(
    "Set-Cookie",
    `${AUTH_COOKIE}=${encodeURIComponent(token)}; ${httpOnlyCookieOptions(secure)}`
  );
  if (refreshToken) {
    response.headers.append(
      "Set-Cookie",
      `${REFRESH_COOKIE}=${encodeURIComponent(refreshToken)}; ${httpOnlyCookieOptions(secure)}`
    );
  }
  response.headers.append(
    "Set-Cookie",
    `${USER_COOKIE}=${encodeURIComponent(JSON.stringify(userPayload))}; ${cookieOptions(secure)}`
  );

  return response;
}
