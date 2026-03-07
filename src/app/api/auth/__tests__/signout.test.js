import { describe, it, expect } from "vitest";
import { POST } from "../signout/route";

describe("POST /api/auth/signout", () => {
  it("returns 200 and clears auth cookies", async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("auth_token");
    expect(setCookie).toContain("auth_refresh_token");
    expect(setCookie).toContain("auth_user");
    expect(setCookie).toContain("max-age=0");
  });
});
