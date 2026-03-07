/** Sign out - clears auth cookies */
import { NextResponse } from "next/server";

const AUTH_COOKIE = "auth_token";
const REFRESH_COOKIE = "auth_refresh_token";
const USER_COOKIE = "auth_user";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.headers.append("Set-Cookie", `${AUTH_COOKIE}=; path=/; max-age=0`);
  response.headers.append("Set-Cookie", `${REFRESH_COOKIE}=; path=/; max-age=0`);
  response.headers.append("Set-Cookie", `${USER_COOKIE}=; path=/; max-age=0`);
  return response;
}
