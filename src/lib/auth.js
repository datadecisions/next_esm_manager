"use client";

/**
 * Auth helpers – token storage and retrieval via cookies.
 * Cookie name matches middleware: auth_token
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const TOKEN_COOKIE = "auth_token";
const USER_NAME_COOKIE = "auth_user_name";
const TOKEN_MAX_AGE = 36000; // 10 hours, matching ESM server default

/**
 * Set the auth token and optionally user display name.
 * @param {string} token - JWT from /api/v1/authenticate
 * @param {{ name?: string }} [user] - User data from auth response
 */
export function setAuthToken(token, user) {
  const value = encodeURIComponent(token);
  document.cookie = `${TOKEN_COOKIE}=${value}; path=/; max-age=${TOKEN_MAX_AGE}; SameSite=Lax`;
  if (user?.name) {
    document.cookie = `${USER_NAME_COOKIE}=${encodeURIComponent(user.name)}; path=/; max-age=${TOKEN_MAX_AGE}; SameSite=Lax`;
  }
}

/**
 * Get the auth token from cookies (client-side only).
 * @returns {string|null}
 */
export function getAuthToken() {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${TOKEN_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Get the user display name from cookies (client-side only).
 * @returns {string|null}
 */
export function getAuthUserName() {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${USER_NAME_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Clear the auth token and user data (sign out).
 */
export function clearAuthToken() {
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0`;
  document.cookie = `${USER_NAME_COOKIE}=; path=/; max-age=0`;
}

/**
 * Hook for auth state. Use in client components that need token or redirect.
 * Token is optional for API calls – fetchWithAuth auto-injects it from the cookie.
 *
 * @param {{ redirectToSignIn?: boolean }} [options]
 * @returns {{ token: string|null; isLoading: boolean; isAuthenticated: boolean }}
 */
export function useAuth(options = {}) {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [mounted, setMounted] = useState(false);
  const redirectToSignIn = options.redirectToSignIn ?? false;

  useEffect(() => {
    setMounted(true);
    const t = getAuthToken();
    setToken(t);
    if (redirectToSignIn && !t) {
      router.push("/sign-in");
    }
  }, [router, redirectToSignIn]);

  return {
    token,
    isLoading: !mounted,
    isAuthenticated: !!token,
  };
}
