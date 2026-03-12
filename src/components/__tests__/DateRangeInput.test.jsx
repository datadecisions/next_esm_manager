import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DateRangeInput, DateInput } from "../DateRangeInput";

describe("DateRangeInput", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders start and end date inputs", () => {
    const onDebouncedChange = vi.fn();
    render(
      <DateRangeInput
        startDate="2025-01-15"
        endDate="2025-01-31"
        onStartDateChange={() => {}}
        onEndDateChange={() => {}}
        onDebouncedChange={onDebouncedChange}
      />
    );
    expect(screen.getByLabelText(/Start Date/i)).toHaveValue("2025-01-15");
    expect(screen.getByLabelText(/End Date/i)).toHaveValue("2025-01-31");
  });

  it("calls onDebouncedChange with valid dates after delay", () => {
    const onDebouncedChange = vi.fn();
    render(
      <DateRangeInput
        startDate="2025-01-15"
        endDate="2025-01-31"
        onStartDateChange={() => {}}
        onEndDateChange={() => {}}
        onDebouncedChange={onDebouncedChange}
      />
    );

    vi.advanceTimersByTime(400);
    expect(onDebouncedChange).toHaveBeenCalledWith("2025-01-15", "2025-01-31", true);
  });

  it("calls onStartDateChange when start date changes", () => {
    const onStartDateChange = vi.fn();
    render(
      <DateRangeInput
        startDate="2025-01-15"
        endDate="2025-01-31"
        onStartDateChange={onStartDateChange}
        onEndDateChange={() => {}}
        onDebouncedChange={() => {}}
      />
    );

    fireEvent.change(screen.getByLabelText(/Start Date/i), {
      target: { value: "2026-02-20" },
    });

    expect(onStartDateChange).toHaveBeenCalledWith("2026-02-20");
  });
});

describe("DateInput", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders single date input", () => {
    render(
      <DateInput
        date="2025-02-15"
        onDateChange={() => {}}
        onDebouncedChange={() => {}}
      />
    );
    expect(screen.getByLabelText(/^Date$/i)).toHaveValue("2025-02-15");
  });

  it("calls onDebouncedChange with valid date after delay", () => {
    const onDebouncedChange = vi.fn();
    render(
      <DateInput
        date="2025-02-15"
        onDateChange={() => {}}
        onDebouncedChange={onDebouncedChange}
      />
    );
    vi.advanceTimersByTime(400);
    expect(onDebouncedChange).toHaveBeenCalledWith("2025-02-15", true);
  });
});
