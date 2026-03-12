import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useDebouncedDateRange,
  useDebouncedDate,
} from "../use-debounced-date-range";

describe("useDebouncedDateRange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns debounced values after delay", () => {
    const { result, rerender } = renderHook(
      ({ start, end }) => useDebouncedDateRange(start, end, { delay: 400 }),
      { initialProps: { start: "2025-01-01", end: "2025-01-31" } }
    );

    expect(result.current.debouncedStart).toBe("2025-01-01");
    expect(result.current.debouncedEnd).toBe("2025-01-31");
    expect(result.current.isValid).toBe(true);

    rerender({ start: "2025-02-01", end: "2025-02-28" });
    expect(result.current.debouncedStart).toBe("2025-01-01");
    expect(result.current.debouncedEnd).toBe("2025-01-31");

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.debouncedStart).toBe("2025-02-01");
    expect(result.current.debouncedEnd).toBe("2025-02-28");
    expect(result.current.isValid).toBe(true);
  });

  it("returns isValid false for invalid dates", () => {
    const { result } = renderHook(() =>
      useDebouncedDateRange("0020-01-08", "0020-01-08", { delay: 400 })
    );

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.isValid).toBe(false);
  });

  it("returns isValid false for partial year input", () => {
    const { result, rerender } = renderHook(
      ({ start, end }) => useDebouncedDateRange(start, end, { delay: 400 }),
      { initialProps: { start: "202", end: "2025-01-31" } }
    );

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.isValid).toBe(false);
  });

  it("returns isValid false when only one date is invalid", () => {
    const { result } = renderHook(() =>
      useDebouncedDateRange("2025-01-01", "0020-01-08", { delay: 400 })
    );

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.isValid).toBe(false);
  });

  it("does not update debounced value before delay", () => {
    const { result, rerender } = renderHook(
      ({ start, end }) => useDebouncedDateRange(start, end, { delay: 400 }),
      { initialProps: { start: "2025-01-01", end: "2025-01-31" } }
    );

    rerender({ start: "2026-01-01", end: "2026-01-31" });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.debouncedStart).toBe("2025-01-01");
    expect(result.current.debouncedEnd).toBe("2025-01-31");

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.debouncedStart).toBe("2026-01-01");
    expect(result.current.debouncedEnd).toBe("2026-01-31");
  });
});

describe("useDebouncedDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns debounced date after delay", () => {
    const { result, rerender } = renderHook(
      ({ date }) => useDebouncedDate(date, { delay: 400 }),
      { initialProps: { date: "2025-02-15" } }
    );

    expect(result.current.debouncedDate).toBe("2025-02-15");
    expect(result.current.isValid).toBe(true);

    rerender({ date: "2026-03-20" });
    expect(result.current.debouncedDate).toBe("2025-02-15");

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.debouncedDate).toBe("2026-03-20");
    expect(result.current.isValid).toBe(true);
  });

  it("returns isValid false for invalid date", () => {
    const { result } = renderHook(() =>
      useDebouncedDate("0020-01-08", { delay: 400 })
    );

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.isValid).toBe(false);
  });
});
