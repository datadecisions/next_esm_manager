"use client";

import { useEffect, useId } from "react";
import { Input } from "@/components/ui/input";
import {
  useDebouncedDateRange,
  useDebouncedDate,
} from "@/hooks/use-debounced-date-range";
import { cn } from "@/lib/utils";

function toYMD(d) {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

/**
 * Shared date range input with built-in debouncing and validation.
 * Use for filters that trigger API calls - prevents invalid dates (e.g. "0020" while typing) from being sent.
 *
 * @param {string} startDate - Start date (YYYY-MM-DD or Date)
 * @param {string} endDate - End date (YYYY-MM-DD or Date)
 * @param {function} onStartDateChange - Called when start date changes (immediate, for display)
 * @param {function} onEndDateChange - Called when end date changes (immediate, for display)
 * @param {function} onDebouncedChange - Called when debounced valid values are ready: (start, end, isValid) => void
 * @param {object} [options] - { delay?: number } default 400ms
 * @param {string} [className] - Wrapper className
 * @param {string} [startLabel] - Label for start date
 * @param {string} [endLabel] - Label for end date
 * @param {string} [inputClassName] - Input className
 */
export function DateRangeInput({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onDebouncedChange,
  options = {},
  className,
  startLabel = "Start Date",
  endLabel = "End Date",
  inputClassName = "w-[140px]",
}) {
  const id = useId();
  const startStr = toYMD(startDate);
  const endStr = toYMD(endDate);

  const { debouncedStart, debouncedEnd, isValid } = useDebouncedDateRange(
    startStr,
    endStr,
    { delay: options.delay ?? 400 }
  );

  useEffect(() => {
    onDebouncedChange?.(debouncedStart, debouncedEnd, isValid);
  }, [debouncedStart, debouncedEnd, isValid, onDebouncedChange]);

  const handleStartChange = (e) => {
    onStartDateChange?.(e.target.value || "");
  };

  const handleEndChange = (e) => {
    onEndDateChange?.(e.target.value || "");
  };

  return (
    <div className={cn("flex items-end gap-2", className)}>
      <div>
        <label htmlFor={`${id}-start`} className="text-sm font-medium mb-2 block">
          {startLabel}
        </label>
        <Input
          id={`${id}-start`}
          type="date"
          value={startStr || ""}
          onChange={handleStartChange}
          className={inputClassName}
          aria-invalid={!isValid && (startStr || endStr) ? "true" : undefined}
        />
      </div>
      <span className="text-muted-foreground pb-2">–</span>
      <div>
        <label htmlFor={`${id}-end`} className="text-sm font-medium mb-2 block">
          {endLabel}
        </label>
        <Input
          id={`${id}-end`}
          type="date"
          value={endStr || ""}
          onChange={handleEndChange}
          className={inputClassName}
          aria-invalid={!isValid && (startStr || endStr) ? "true" : undefined}
        />
      </div>
    </div>
  );
}

/**
 * Shared single date input with built-in debouncing and validation.
 *
 * @param {string} date - Date (YYYY-MM-DD or Date)
 * @param {function} onDateChange - Called when date changes (immediate)
 * @param {function} onDebouncedChange - Called when debounced valid value is ready: (date, isValid) => void
 * @param {object} [options] - { delay?: number } default 400ms
 * @param {string} [label] - Label for the input
 * @param {string} [className] - Wrapper className
 * @param {string} [inputClassName] - Input className
 */
export function DateInput({
  date,
  onDateChange,
  onDebouncedChange,
  options = {},
  label = "Date",
  className,
  inputClassName = "w-[140px]",
}) {
  const id = useId();
  const dateStr = toYMD(date);

  const { debouncedDate, isValid } = useDebouncedDate(dateStr, {
    delay: options.delay ?? 400,
  });

  useEffect(() => {
    onDebouncedChange?.(debouncedDate, isValid);
  }, [debouncedDate, isValid, onDebouncedChange]);

  const handleChange = (e) => {
    const val = e.target.value;
    onDateChange?.(val || "");
  };

  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium mb-2 block">
        {label}
      </label>
      <Input
        id={id}
        type="date"
        value={dateStr || ""}
        onChange={handleChange}
        className={inputClassName}
        aria-invalid={!isValid && dateStr ? "true" : undefined}
      />
    </div>
  );
}
