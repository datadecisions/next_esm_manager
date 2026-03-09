import { describe, it, expect } from "vitest";
import { isBinaryContentType } from "../proxyHelpers";

describe("isBinaryContentType", () => {
  it("returns true for application/zip", () => {
    expect(isBinaryContentType("application/zip")).toBe(true);
  });

  it("returns true for application/pdf", () => {
    expect(isBinaryContentType("application/pdf")).toBe(true);
  });

  it("returns true for application/octet-stream", () => {
    expect(isBinaryContentType("application/octet-stream")).toBe(true);
  });

  it("returns true for image types", () => {
    expect(isBinaryContentType("image/jpeg")).toBe(true);
    expect(isBinaryContentType("image/png")).toBe(true);
    expect(isBinaryContentType("image/gif")).toBe(true);
    expect(isBinaryContentType("image/webp")).toBe(true);
  });

  it("returns false for JSON and text", () => {
    expect(isBinaryContentType("application/json")).toBe(false);
    expect(isBinaryContentType("text/plain")).toBe(false);
    expect(isBinaryContentType("text/html")).toBe(false);
    expect(isBinaryContentType("text/csv")).toBe(false);
  });

  it("returns false for null or empty", () => {
    expect(isBinaryContentType(null)).toBe(false);
    expect(isBinaryContentType("")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isBinaryContentType("APPLICATION/PDF")).toBe(true);
    expect(isBinaryContentType("Image/JPEG")).toBe(true);
  });
});
