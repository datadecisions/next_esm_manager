import { describe, it, expect } from "vitest";
import { getTokenFromRequest, requireAuth } from "../apiRouteAuth";

function mockRequest({ headers = {}, cookies = {} } = {}) {
  return {
    headers: {
      get: (name) => headers[name] ?? null,
    },
    cookies: {
      get: (name) => (cookies[name] ? { value: cookies[name] } : undefined),
    },
  };
}

describe("getTokenFromRequest", () => {
  it("returns token from x-access-token header", () => {
    const req = mockRequest({ headers: { "x-access-token": "Bearer abc123" } });
    expect(getTokenFromRequest(req)).toBe("Bearer abc123");
  });

  it("prefers header over cookie", () => {
    const req = mockRequest({
      headers: { "x-access-token": "header-token" },
      cookies: { auth_token: "cookie-token" },
    });
    expect(getTokenFromRequest(req)).toBe("header-token");
  });

  it("returns token from auth_token cookie when header is missing", () => {
    const req = mockRequest({ cookies: { auth_token: "cookie-token-xyz" } });
    expect(getTokenFromRequest(req)).toBe("cookie-token-xyz");
  });

  it("trims whitespace from header token", () => {
    const req = mockRequest({ headers: { "x-access-token": "  token  " } });
    expect(getTokenFromRequest(req)).toBe("token");
  });

  it("returns null when no token present", () => {
    const req = mockRequest({});
    expect(getTokenFromRequest(req)).toBe(null);
  });

  it("returns null when cookie value is empty", () => {
    const req = mockRequest({ cookies: { auth_token: "   " } });
    expect(getTokenFromRequest(req)).toBe(null);
  });
});

describe("requireAuth", () => {
  it("returns { token } when token is present", () => {
    const req = mockRequest({ headers: { "x-access-token": "valid-token" } });
    const result = requireAuth(req);
    expect(result).toEqual({ token: "valid-token" });
    expect(result.unauthorized).toBeUndefined();
  });

  it("returns { unauthorized } with 401 when token is missing", () => {
    const req = mockRequest({});
    const result = requireAuth(req);
    expect(result.unauthorized).toBeDefined();
    expect(result.token).toBeUndefined();
    expect(result.unauthorized.status).toBe(401);
  });

  it("returns { unauthorized } when token is null", () => {
    const req = mockRequest({ cookies: { auth_token: "   " } });
    const result = requireAuth(req);
    expect(result.unauthorized).toBeDefined();
    expect(result.unauthorized.status).toBe(401);
  });
});
