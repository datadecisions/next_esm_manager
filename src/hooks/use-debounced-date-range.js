"use client";

import { useMemo } from "react";
import { useDebouncedValue } from "./use-debounced-value";
import { isValidDateStr } from "@/lib/date-validation";

/**
 * Debounces and validates a date range for API calls.
 * Use for date inputs where typing can produce intermediate invalid values.
 *
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {{ delay?: number }} [options] - Options, default delay 400ms
 * @returns {{ debouncedStart: string; debouncedEnd: string; isValid: boolean }}
 */
export function useDebouncedDateRange(startDate, endDate, options = {}) {
  const delay = options.delay ?? 400;
  const debouncedStart = useDebouncedValue(startDate, delay);
  const debouncedEnd = useDebouncedValue(endDate, delay);

  const isValid = useMemo(
    () => isValidDateStr(debouncedStart) && isValidDateStr(debouncedEnd),
    [debouncedStart, debouncedEnd]
  );

  return { debouncedStart, debouncedEnd, isValid };
}

/**
 * Debounces and validates a single date for API calls.
 * Use for single-date inputs where typing can produce intermediate invalid values.
 *
 * @param {string} date - Date (YYYY-MM-DD)
 * @param {{ delay?: number }} [options] - Options, default delay 400ms
 * @returns {{ debouncedDate: string; isValid: boolean }}
 */
export function useDebouncedDate(date, options = {}) {
  const delay = options.delay ?? 400;
  const debouncedDate = useDebouncedValue(date, delay);

  const isValid = useMemo(() => isValidDateStr(debouncedDate), [debouncedDate]);

  return { debouncedDate, isValid };
}
