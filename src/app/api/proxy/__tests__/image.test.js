import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../image/route";

function mockRequest({ url = "http://localhost/api/proxy/image", headers = {}, cookies = {} } = {}) {
  return {
    url,
    headers: { get: (n) => headers[n] ?? null },
    cookies: {
      get: (name) => (cookies[name] ? { value: cookies[name] } : undefined),
    },
  };
}

describe("GET /api/proxy/image", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("returns 401 when not authenticated", async () => {
    const req = mockRequest({
      url: "http://localhost/api/proxy/image?source=work_order&id=1",
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Authentication required");
  });

  it("returns 400 when source or id missing", async () => {
    const req = mockRequest({
      headers: { "x-access-token": "token" },
      url: "http://localhost/api/proxy/image?source=work_order",
    });
    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Missing");
  });

  it("returns 400 when API URL not configured", async () => {
    const orig = process.env.NEXT_PUBLIC_API_URL;
    process.env.NEXT_PUBLIC_API_URL = "";
    vi.resetModules();
    const { GET: GETHandler } = await import("../image/route");
    const req = mockRequest({
      headers: { "x-access-token": "token" },
      url: "http://localhost/api/proxy/image?source=work_order&id=1",
    });
    const res = await GETHandler(req);
    process.env.NEXT_PUBLIC_API_URL = orig;
    vi.resetModules();
    expect(res.status).toBe(400);
  });

  it("returns blob on success for work_order source", async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });
    global.fetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(blob),
      headers: { get: () => "image/png" },
    });
    const req = mockRequest({
      headers: { "x-access-token": "token" },
      url: "http://localhost/api/proxy/image?source=work_order&id=123",
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toContain("max-age=3600");
  });

  it("returns blob on success for customer source", async () => {
    const blob = new Blob([new Uint8Array([4, 5, 6])], { type: "image/jpeg" });
    global.fetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(blob),
      headers: { get: () => "image/jpeg" },
    });
    const req = mockRequest({
      headers: { "x-access-token": "token" },
      url: "http://localhost/api/proxy/image?source=customer&id=456",
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
  });

  it("returns blob on success for documents source with table", async () => {
    const blob = new Blob([new Uint8Array([7, 8, 9])], { type: "image/png" });
    global.fetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(blob),
      headers: { get: () => "image/png" },
    });
    const req = mockRequest({
      headers: { "x-access-token": "token" },
      url: "http://localhost/api/proxy/image?source=documents&table=wo&id=123",
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
  });

  it("returns blob on success for path param", async () => {
    const blob = new Blob([new Uint8Array([10, 11, 12])], { type: "image/jpeg" });
    global.fetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(blob),
      headers: { get: () => "image/jpeg" },
    });
    const req = mockRequest({
      headers: { "x-access-token": "token" },
      url: "http://localhost/api/proxy/image?path=work_order/image/999",
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
  });

  it("returns 404 when wo_signature has no image", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
      headers: { get: () => "application/json" },
    });
    const req = mockRequest({
      headers: { "x-access-token": "token" },
      url: "http://localhost/api/proxy/image?source=wo_signature&id=789",
    });
    const res = await GET(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain("No signature image");
  });

  it("returns image blob for wo_signature with valid data", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([{ Image: { type: "Buffer", data: [255, 216, 255] } }]),
      headers: { get: () => "application/json" },
    });
    const req = mockRequest({
      headers: { "x-access-token": "token" },
      url: "http://localhost/api/proxy/image?source=wo_signature&id=789",
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
  });

  it("returns backend error when fetch fails", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve("Not found"),
    });
    const req = mockRequest({
      headers: { "x-access-token": "token" },
      url: "http://localhost/api/proxy/image?source=work_order&id=999",
    });
    const res = await GET(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain("Backend");
  });
});
