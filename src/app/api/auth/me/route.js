/** Get current user info from auth_user cookie */
import { NextResponse } from "next/server";

const USER_COOKIE = "auth_user";

export async function GET(request) {
  const userCookie = request.cookies.get(USER_COOKIE)?.value;
  if (!userCookie) return NextResponse.json(null, { status: 200 });
  try {
    const user = JSON.parse(decodeURIComponent(userCookie));
    return NextResponse.json(user);
  } catch {
    return NextResponse.json(null, { status: 200 });
  }
}
