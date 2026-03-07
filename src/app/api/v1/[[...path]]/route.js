/**
 * API proxy - forwards /api/v1/* to ESM backend with auth from cookie.
 */
import { NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/apiRouteAuth";

const BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

async function proxyRequest(request, pathSegments) {
  const token = getTokenFromRequest(request);
  if (!token) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  if (!BASE) {
    return NextResponse.json(
      { error: "API URL not configured" },
      { status: 500 }
    );
  }

  const path = pathSegments?.length ? pathSegments.join("/") : "";
  const url = `${BASE}/api/v1/${path}${request.nextUrl.search}`;

  const headers = new Headers();
  headers.set("x-access-token", token);
  const contentType = request.headers.get("Content-Type");
  if (contentType) headers.set("Content-Type", contentType);

  let body;
  if (["GET", "HEAD"].includes(request.method)) {
    body = undefined;
  } else if (contentType?.startsWith("multipart/form-data")) {
    body = await request.blob();
  } else {
    body = await request.text();
  }

  const res = await fetch(url, {
    method: request.method,
    headers,
    body,
  });

  const resContentType = res.headers.get("Content-Type") || "";
  const resBody = await res.text();

  if (!res.ok) {
    try {
      const json = JSON.parse(resBody);
      return NextResponse.json(json, { status: res.status });
    } catch {
      return new NextResponse(resBody, {
        status: res.status,
        headers: { "Content-Type": resContentType },
      });
    }
  }

  if (resContentType.includes("application/json")) {
    try {
      return NextResponse.json(JSON.parse(resBody));
    } catch {
      return new NextResponse(resBody, {
        status: 200,
        headers: { "Content-Type": resContentType },
      });
    }
  }

  return new NextResponse(resBody, {
    status: 200,
    headers: { "Content-Type": resContentType },
  });
}

export async function GET(request, context) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function POST(request, context) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function PUT(request, context) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function PATCH(request, context) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function DELETE(request, context) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}
