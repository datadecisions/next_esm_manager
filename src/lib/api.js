/**
 * ESM API client – uses NEXT_PUBLIC_API_URL for the legacy server base URL.
 */

import { getAuthToken } from "@/lib/auth";

const getApiBase = () => process.env.NEXT_PUBLIC_API_URL || "";

/**
 * Authenticate with username/password. Calls POST /api/v1/authenticate.
 * @param {{ username: string; password: string }} credentials
 * @returns {Promise<{ success: true; token: string; name?: string } | { success: false; message: string }>}
 */
export async function authenticate(credentials) {
  const base = getApiBase();
  if (!base) {
    return { success: false, message: "API URL not configured. Set NEXT_PUBLIC_API_URL." };
  }

  const url = `${base.replace(/\/$/, "")}/api/v1/authenticate`;
  const body = new URLSearchParams({
    username: credentials.username,
    password: credentials.password,
  }).toString();

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        message: data?.message || "Authentication failed.",
      };
    }

    if (!data.success || !data.token) {
      return {
        success: false,
        message: data?.message || "Authentication failed.",
      };
    }

    return {
      success: true,
      token: data.token,
      name: data.name,
      longName: data.longName,
      branch: data.branch,
      dept: data.dept,
    };
  } catch (err) {
    return {
      success: false,
      message: err?.message || "Network error. Is the ESM server running?",
    };
  }
}

/**
 * Fetch with JWT in x-access-token header (client-side only).
 * Token is optional: when omitted, it is read from the auth cookie via getAuthToken().
 * Callers can pass token explicitly when they already have it (e.g. from useAuth).
 *
 * @param {string} path - API path, e.g. "/api/v1/check"
 * @param {RequestInit} [options]
 * @param {string|null} [token] - Optional; when omitted, uses getAuthToken()
 */
export async function fetchWithAuth(path, options = {}, token) {
  const t = token ?? getAuthToken();
  const base = getApiBase();
  const url = `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = {
    ...options.headers,
    ...(t && { "x-access-token": t }),
  };
  return fetch(url, { ...options, headers });
}

export { getApiBase };
