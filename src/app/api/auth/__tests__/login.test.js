import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../login/route";

function mockRequest({ url = "http://localhost", headers = {}, body } = {}) {
  return {
    url,
    headers: { get: (n) => headers[n] ?? null },
    json: () => Promise.resolve(body ?? {}),
  };
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn();
  });

  it("returns 429 when rate limited", async () => {
    const req = mockRequest({
      headers: { "x-forwarded-for": "127.0.0.99" },
      body: { username: "u", password: "p" },
    });
    global.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ success: false, message: "Invalid" }),
    });

    for (let i = 0; i < 5; i++) await POST(req);
    const res = await POST(req);
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.message).toContain("Too many");
  });

  it("returns 500 when API URL not configured", async () => {
    const orig = process.env.NEXT_PUBLIC_API_URL;
    process.env.NEXT_PUBLIC_API_URL = "";
    vi.resetModules();
    const { POST: POSTHandler } = await import("../login/route");
    const req = mockRequest({
      headers: { "x-real-ip": "10.0.0.1" },
      body: { username: "u", password: "p" },
    });
    const res = await POSTHandler(req);
    process.env.NEXT_PUBLIC_API_URL = orig;
    vi.resetModules();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.message).toBe("API URL not configured");
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = {
      url: "http://localhost",
      headers: { get: (n) => (n === "x-real-ip" ? "10.0.0.6" : null) },
      json: () => Promise.reject(new Error("parse error")),
    };
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toBe("Invalid request body");
  });

  it("returns 400 when username or password missing", async () => {
    const reqNoUser = mockRequest({
      headers: { "x-real-ip": "10.0.0.2" },
      body: { password: "p" },
    });
    const r1 = await POST(reqNoUser);
    expect(r1.status).toBe(400);
    const d1 = await r1.json();
    expect(d1.message).toContain("Username and password");

    const reqNoPass = mockRequest({
      headers: { "x-real-ip": "10.0.0.3" },
      body: { username: "u" },
    });
    const r2 = await POST(reqNoPass);
    expect(r2.status).toBe(400);
  });

  it("returns 401 when backend rejects credentials", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ success: false, message: "Invalid credentials" }),
    });
    const req = mockRequest({
      headers: { "x-real-ip": "10.0.0.4" },
      body: { username: "u", password: "wrong" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.message).toBe("Invalid credentials");
  });

  it("returns 200 and sets cookies on success (no token in response)", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          token: "access-token",
          refreshToken: "refresh-token",
          name: "John",
        }),
    });
    const req = mockRequest({
      headers: { "x-real-ip": "10.0.0.5" },
      body: { username: "u", password: "p" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.name).toBe("John");
    expect(data.token).toBeUndefined();
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("auth_token");
    expect(setCookie).toContain("auth_refresh_token");
    expect(setCookie).toContain("auth_user");
  });
});
