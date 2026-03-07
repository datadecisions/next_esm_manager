"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "esm-manager-branch-dept-filter";

const DEFAULT_VALUE = {
  branches: [],
  depts: [],
  selectAllDepts: false,
};

function loadFromStorage() {
  if (typeof window === "undefined") return DEFAULT_VALUE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VALUE;
    const parsed = JSON.parse(raw);
    return {
      branches: Array.isArray(parsed?.branches) ? parsed.branches : [],
      depts: Array.isArray(parsed?.depts) ? parsed.depts : [],
      selectAllDepts: Boolean(parsed?.selectAllDepts),
    };
  } catch {
    return DEFAULT_VALUE;
  }
}

function saveToStorage(value) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage errors (quota, private mode, etc.)
  }
}

/**
 * Persisted branch/dept filter shared across the app.
 * Values are stored in localStorage and survive page navigation and browser restarts.
 *
 * @returns {[object, function]} [value, setValue] - Same API as useState
 */
export function useBranchDeptFilter() {
  const [value, setValueState] = useState(DEFAULT_VALUE);

  // Hydrate from localStorage on mount (client-only)
  useEffect(() => {
    queueMicrotask(() => setValueState(loadFromStorage()));
  }, []);

  const setValue = useCallback((next) => {
    setValueState((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      const nextValue = {
        branches: Array.isArray(resolved?.branches) ? resolved.branches : prev.branches,
        depts: Array.isArray(resolved?.depts) ? resolved.depts : prev.depts,
        selectAllDepts: Boolean(resolved?.selectAllDepts ?? prev.selectAllDepts),
      };
      saveToStorage(nextValue);
      return nextValue;
    });
  }, []);

  return [value, setValue];
}
