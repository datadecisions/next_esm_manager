import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../refresh/route";

function mockRequest({ url = "http://localhost", headers = {}, cookies = {} } = {}) {
  return {
    url,
    headers: { get: (n) => headers[n] ?? null },
    cookies: {
      get: (name) => (cookies[name] ? { value: cookies[name] } : undefined),
    },
  };
}

describe("POST /api/auth/refresh", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("returns 429 when rate limited", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, token: "t" }),
    });
    const req = mockRequest({
      headers: { "x-real-ip": "192.168.1.1" },
      cookies: { auth_refresh_token: "refresh-token" },
    });
    for (let i = 0; i < 31; i++) await POST(req);
    const res = await POST(req);
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.message).toContain("Too many");
  });

  it("returns 500 when API URL not configured", async () => {
    const orig = process.env.NEXT_PUBLIC_API_URL;
    process.env.NEXT_PUBLIC_API_URL = "";
    vi.resetModules();
    const { POST: POSTHandler } = await import("../refresh/route");
    const req = mockRequest({
      headers: { "x-real-ip": "10.0.0.1" },
      cookies: { auth_refresh_token: "token" },
    });
    const res = await POSTHandler(req);
    process.env.NEXT_PUBLIC_API_URL = orig;
    vi.resetModules();
    expect(res.status).toBe(500);
  });

  it("returns 401 when no refresh token cookie", async () => {
    const req = mockRequest({ headers: { "x-real-ip": "10.0.0.2" } });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.message).toBe("No refresh token");
  });

  it("returns 401 and clears cookies when backend rejects", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ success: false, message: "Session expired" }),
    });
    const req = mockRequest({
      headers: { "x-real-ip": "10.0.0.3" },
      cookies: { auth_refresh_token: "bad-token" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("auth_token");
    expect(setCookie).toContain("auth_refresh_token");
    expect(setCookie).toContain("max-age=0");
  });

  it("returns 200 and sets new cookies on success", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          token: "new-access",
          refreshToken: "new-refresh",
        }),
    });
    const req = mockRequest({
      headers: { "x-real-ip": "10.0.0.4" },
      cookies: { auth_refresh_token: "valid-refresh" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("auth_token");
    expect(setCookie).toContain("new-access");
  });
});
