import { describe, it, expect, beforeEach, vi } from "vitest";
import { loginLimiter, refreshLimiter } from "../rateLimit";

function mockRequest(headers = {}) {
  return {
    headers: {
      get: (name) => headers[name] ?? null,
    },
  };
}

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe("loginLimiter", () => {
    it("extracts IP from x-forwarded-for (first entry)", () => {
      const req = mockRequest({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
      const r1 = loginLimiter.check(req);
      expect(r1.limited).toBe(false);

      for (let i = 0; i < 4; i++) loginLimiter.check(req);
      const r5 = loginLimiter.check(req);
      expect(r5.limited).toBe(true);
      expect(r5.remaining).toBe(0);
      expect(r5.retryAfter).toBeDefined();
    });

    it("falls back to x-real-ip when x-forwarded-for is missing", () => {
      const req = mockRequest({ "x-real-ip": "10.0.0.1" });
      const r = loginLimiter.check(req);
      expect(r.limited).toBe(false);
      expect(r.remaining).toBe(4);
    });

    it("uses 'unknown' when no IP headers present", () => {
      const req = mockRequest({});
      const r = loginLimiter.check(req);
      expect(r.limited).toBe(false);
    });

    it("limits after maxAttempts (5) within window", () => {
      const req = mockRequest({ "x-real-ip": "192.168.1.1" });

      for (let i = 0; i < 5; i++) {
        const r = loginLimiter.check(req);
        expect(r.limited).toBe(false);
        expect(r.remaining).toBe(4 - i);
      }

      const r6 = loginLimiter.check(req);
      expect(r6.limited).toBe(true);
      expect(r6.remaining).toBe(0);
      expect(r6.retryAfter).toBeGreaterThan(0);
    });

    it("reset clears the counter", () => {
      const req = mockRequest({ "x-real-ip": "192.168.1.2" });

      for (let i = 0; i < 3; i++) loginLimiter.check(req);
      loginLimiter.reset(req);

      const r = loginLimiter.check(req);
      expect(r.limited).toBe(false);
      expect(r.remaining).toBe(4);
    });

    it("window resets after windowMs", () => {
      const req = mockRequest({ "x-real-ip": "192.168.1.3" });

      for (let i = 0; i < 5; i++) loginLimiter.check(req);
      expect(loginLimiter.check(req).limited).toBe(true);

      vi.advanceTimersByTime(15 * 60 * 1000 + 1);

      const r = loginLimiter.check(req);
      expect(r.limited).toBe(false);
      expect(r.remaining).toBe(4);
    });
  });

  describe("refreshLimiter", () => {
    it("allows 30 requests per minute", () => {
      const req = mockRequest({ "x-real-ip": "10.10.10.10" });

      for (let i = 0; i < 30; i++) {
        const r = refreshLimiter.check(req);
        expect(r.limited).toBe(false);
      }

      const r31 = refreshLimiter.check(req);
      expect(r31.limited).toBe(true);
      expect(r31.remaining).toBe(0);
    });
  });
});
