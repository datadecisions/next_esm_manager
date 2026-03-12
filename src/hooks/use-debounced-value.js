"use client";

import { useState, useEffect } from "react";

/**
 * Returns a debounced version of the given value.
 * The debounced value updates only after `delay` ms of the value not changing.
 * Useful for inputs (e.g. date pickers) where intermediate values during typing
 * should not trigger API calls.
 *
 * @param {T} value - The value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {T} - The debounced value
 */
export function useDebouncedValue(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
