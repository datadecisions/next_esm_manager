/**
 * ESM API client – all calls go same-origin. Auth via httpOnly cookies (XSS-safe).
 */

import { getBaseUrl } from "./base";
import { refreshAccessToken, signOut } from "./auth";

let refreshPromise = null;

async function doFetch(path, options = {}, skipRetry = false) {
  const base = getBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (res.status === 401 && !skipRetry) {
    try {
      if (!refreshPromise) refreshPromise = refreshAccessToken();
      await refreshPromise;
      refreshPromise = null;
      return doFetch(path, options, true);
    } catch {
      refreshPromise = null;
      signOut();
      if (typeof window !== "undefined") window.location.href = "/sign-in";
      throw new Error("Session expired. Please sign in again.");
    }
  }

  return res;
}

/**
 * Authenticate with username/password via our proxy.
 * @param {{ username: string; password: string }} credentials
 */
export async function authenticate(credentials) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      username: credentials.username?.trim(),
      password: credentials.password,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 429) {
    const err = new Error(data?.message || "Too many sign-in attempts.");
    err.attemptsRemaining = 0;
    err.retryAfter = data?.retryAfter;
    throw err;
  }

  if (!res.ok) {
    const err = new Error(data?.message || `Sign in failed (${res.status})`);
    if (data?.attemptsRemaining !== undefined) err.attemptsRemaining = data.attemptsRemaining;
    if (data?.retryAfter) err.retryAfter = data.retryAfter;
    throw err;
  }

  if (!data?.success) {
    const err = new Error(data?.message || "Invalid response");
    if (data?.attemptsRemaining !== undefined) err.attemptsRemaining = data.attemptsRemaining;
    throw err;
  }

  return {
    success: true,
    name: data.name,
    longName: data.longName,
    branch: data.branch,
    dept: data.dept,
  };
}

/**
 * Fetch with auth (credentials: include). On 401, attempts refresh and retries once.
 * @param {string} path - e.g. "/api/v1/check"
 * @param {RequestInit} [options]
 * @param {string|null} [token] - Ignored (httpOnly cookie used)
 */
export async function fetchWithAuth(path, options = {}, token) {
  return doFetch(path, options);
}

/**
 * Raw fetch with auth retry - for blob/binary responses.
 */
export async function fetchWithAuthRaw(path, options = {}, skipRetry = false) {
  const base = getBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: options.headers,
  });

  if (res.status === 401 && !skipRetry) {
    try {
      if (!refreshPromise) refreshPromise = refreshAccessToken();
      await refreshPromise;
      refreshPromise = null;
      return fetchWithAuthRaw(path, options, true);
    } catch {
      refreshPromise = null;
      signOut();
      if (typeof window !== "undefined") window.location.href = "/sign-in";
      throw new Error("Session expired. Please sign in again.");
    }
  }

  return res;
}

export const getApiBase = () => getBaseUrl();
