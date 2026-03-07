/**
 * Proxy for document images - fetches from ESM backend with auth token.
 * Avoids CORS and ensures token is forwarded.
 * Requires authentication (x-access-token header or auth_token cookie).
 *
 * GET /api/proxy/image?source=work_order&id=123
 * GET /api/proxy/image?source=customer&id=456
 * GET /api/proxy/image?source=wo_signature&id=789
 * GET /api/proxy/image?path=documents/wo/image/123
 */
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiRouteAuth";

const BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

/** Allowed path chars - no traversal */
const SAFE_PATH = /^[a-zA-Z0-9_/\-.]+$/;

function buildBackendUrl(searchParams) {
  const source = searchParams.get("source");
  const id = searchParams.get("id");
  const path = searchParams.get("path");
  const table = searchParams.get("table");

  if (source && id) {
    if (source === "customer") return `${BASE}/api/v1/customer/image/${id}`;
    if (source === "wo_signature") return `${BASE}/api/v1/work_order/signature/${id}`;
    if (source === "work_order") return `${BASE}/api/v1/work_order/image/${id}`;
    if (source === "documents" && table) return `${BASE}/api/v1/documents/${table}/image/${id}`;
  }

  if (path && SAFE_PATH.test(path) && !path.includes("..")) {
    return `${BASE}/api/v1/${path}`;
  }

  return null;
}

export async function GET(request) {
  const auth = requireAuth(request);
  if (auth.unauthorized) return auth.unauthorized;
  const token = auth.token;

  const { searchParams } = new URL(request.url);
  const url = buildBackendUrl(searchParams);

  if (!BASE || !url) {
    return NextResponse.json(
      { error: "Missing BASE, source+id, or path" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(url, {
      headers: { "x-access-token": token },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Backend ${res.status}: ${text?.slice(0, 200)}` },
        { status: res.status }
      );
    }

    const source = searchParams.get("source");
    if (source === "wo_signature") {
      const json = await res.json();
      const first = Array.isArray(json) ? json[0] : json;
      if (!first?.Image) {
        return NextResponse.json({ error: "No signature image" }, { status: 404 });
      }
      const img = first.Image;
      const bytes =
        img?.type === "Buffer" && Array.isArray(img.data)
          ? new Uint8Array(img.data)
          : img instanceof Uint8Array
            ? img
            : typeof img === "string"
              ? Uint8Array.from(atob(img), (c) => c.charCodeAt(0))
              : null;
      if (!bytes) {
        return NextResponse.json({ error: "Invalid signature data" }, { status: 500 });
      }
      const blob = new Blob([bytes], { type: "image/jpeg" });
      return new NextResponse(blob, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "private, max-age=3600",
        },
      });
    }

    const blob = await res.blob();
    const contentType = res.headers.get("content-type") || "application/octet-stream";
    return new NextResponse(blob, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[proxy/image] fetch error:", err);
    return NextResponse.json(
      { error: err?.message || "Proxy failed" },
      { status: 500 }
    );
  }
}
