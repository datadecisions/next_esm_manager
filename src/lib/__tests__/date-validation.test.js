import { describe, it, expect } from "vitest";
import { isValidDateStr } from "../date-validation";

describe("isValidDateStr", () => {
  it("accepts valid YYYY-MM-DD dates", () => {
    expect(isValidDateStr("2025-01-15")).toBe(true);
    expect(isValidDateStr("2026-12-31")).toBe(true);
    expect(isValidDateStr("1900-01-01")).toBe(true);
    expect(isValidDateStr("2100-12-31")).toBe(true);
    expect(isValidDateStr("2025-02-28")).toBe(true);
    expect(isValidDateStr("2024-02-29")).toBe(true); // leap year
  });

  it("rejects partial year input (e.g. while typing)", () => {
    expect(isValidDateStr("202")).toBe(false);
    expect(isValidDateStr("20")).toBe(false);
    expect(isValidDateStr("2")).toBe(false);
    expect(isValidDateStr("20-01-15")).toBe(false);
  });

  it("rejects invalid year that can be parsed as 2-digit (e.g. 0020) - ERR_OUT_OF_RANGE bug", () => {
    // Typing "202" in year can produce "0020" which causes SQL smalldatetime overflow
    expect(isValidDateStr("0020-01-08")).toBe(false);
    expect(isValidDateStr("0200-01-01")).toBe(false);
    expect(isValidDateStr("0020-01-01")).toBe(false);
  });

  it("rejects invalid dates", () => {
    expect(isValidDateStr("2025-02-30")).toBe(false);
    expect(isValidDateStr("2025-13-01")).toBe(false);
    expect(isValidDateStr("2025-00-01")).toBe(false);
    expect(isValidDateStr("2025-01-00")).toBe(false);
    expect(isValidDateStr("2023-02-29")).toBe(false); // non-leap year
  });

  it("rejects year out of range", () => {
    expect(isValidDateStr("1899-12-31")).toBe(false);
    expect(isValidDateStr("2101-01-01")).toBe(false);
  });

  it("rejects invalid format", () => {
    expect(isValidDateStr("")).toBe(false);
    expect(isValidDateStr(null)).toBe(false);
    expect(isValidDateStr(undefined)).toBe(false);
    expect(isValidDateStr("01/15/2025")).toBe(false);
    expect(isValidDateStr("2025-1-15")).toBe(false);
    expect(isValidDateStr("not-a-date")).toBe(false);
  });

  it("rejects non-string input", () => {
    expect(isValidDateStr(123)).toBe(false);
    expect(isValidDateStr(20250115)).toBe(false);
  });
});
