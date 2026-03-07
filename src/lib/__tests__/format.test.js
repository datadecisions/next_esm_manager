import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatAccountDisplay,
  getWarehouseValue,
  buildInventoryId,
} from "../format";

describe("formatCurrency", () => {
  it("formats valid numbers as USD", () => {
    expect(formatCurrency(1234.56)).toBe("$1,234.56");
    expect(formatCurrency(0)).toBe("$0.00");
    expect(formatCurrency(-10.5)).toBe("-$10.50");
  });

  it("parses string numbers", () => {
    expect(formatCurrency("99.99")).toBe("$99.99");
    expect(formatCurrency("1000")).toBe("$1,000.00");
  });

  it("returns — for null, undefined, empty string", () => {
    expect(formatCurrency(null)).toBe("—");
    expect(formatCurrency(undefined)).toBe("—");
    expect(formatCurrency("")).toBe("—");
  });

  it("returns — for NaN and invalid strings", () => {
    expect(formatCurrency(NaN)).toBe("—");
    expect(formatCurrency("abc")).toBe("—");
    expect(formatCurrency("")).toBe("—");
  });
});

describe("formatDate", () => {
  it("formats valid dates", () => {
    // Use Date(y, m, d) for local dates to avoid timezone shifts
    expect(formatDate(new Date(2025, 2, 15))).toMatch(/Mar.*15.*2025/);
    expect(formatDate(new Date(2025, 0, 1))).toMatch(/Jan.*1.*2025/);
  });

  it("returns — for null, undefined, empty string", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate("")).toBe("—");
  });

  it("returns — for invalid dates", () => {
    expect(formatDate("not-a-date")).toBe("—");
    expect(formatDate("invalid")).toBe("—");
    expect(formatDate(NaN)).toBe("—");
  });

  it("handles timestamp numbers", () => {
    const ts = new Date(2025, 5, 15).getTime();
    expect(formatDate(ts)).toMatch(/Jun.*15.*2025/);
  });
});

describe("formatAccountDisplay", () => {
  it("formats account with AccountNo and Description", () => {
    expect(formatAccountDisplay({ AccountNo: "1100001", Description: "Cash" })).toBe("1100001: Cash");
  });

  it("handles missing fields", () => {
    expect(formatAccountDisplay({ AccountNo: "1100001" })).toBe("1100001:");
    expect(formatAccountDisplay({ Description: "Cash" })).toBe(": Cash");
  });

  it("returns empty string for null/undefined", () => {
    expect(formatAccountDisplay(null)).toBe("");
    expect(formatAccountDisplay(undefined)).toBe("");
  });

  it("trims leading and trailing whitespace", () => {
    expect(formatAccountDisplay({ AccountNo: " 1 ", Description: " Cash " })).toBe("1 :  Cash");
  });
});

describe("getWarehouseValue", () => {
  it("prefers WebWarehouse over Warehouse", () => {
    expect(getWarehouseValue({ WebWarehouse: "Main", Warehouse: "Old" })).toBe("Main");
  });

  it("falls back to Warehouse", () => {
    expect(getWarehouseValue({ Warehouse: "Branch1" })).toBe("Branch1");
  });

  it("handles string input", () => {
    expect(getWarehouseValue("WH1")).toBe("WH1");
  });

  it("returns empty string for null/undefined", () => {
    expect(getWarehouseValue(null)).toBe("");
    expect(getWarehouseValue(undefined)).toBe("");
  });
});

describe("buildInventoryId", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-03-15"));
  });

  it("builds ID as warehouse + month + year", () => {
    expect(buildInventoryId("Main")).toBe("Main32025");
    expect(buildInventoryId("Branch1")).toBe("Branch132025");
  });

  it("returns empty string for empty warehouse", () => {
    expect(buildInventoryId("")).toBe("");
    expect(buildInventoryId("   ")).toBe("");
    expect(buildInventoryId(null)).toBe("");
    expect(buildInventoryId(undefined)).toBe("");
  });

  it("trims warehouse whitespace", () => {
    expect(buildInventoryId("  Main  ")).toBe("Main32025");
  });

  it("uses refDate when provided", () => {
    // Use Date(y, m, d) for local dates (month is 0-indexed)
    expect(buildInventoryId("Main", new Date(2024, 11, 1))).toBe("Main122024");
    expect(buildInventoryId("WH", new Date(2026, 0, 15))).toBe("WH12026");
  });

  it("handles single-digit months (no zero-padding)", () => {
    expect(buildInventoryId("X", new Date("2025-01-10"))).toBe("X12025");
    expect(buildInventoryId("X", new Date("2025-09-10"))).toBe("X92025");
  });
});
