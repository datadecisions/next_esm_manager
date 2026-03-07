"use client";

/**
 * Auth helpers – httpOnly cookies set by server. Client never sees tokens (XSS-safe).
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const USER_COOKIE = "auth_user";

function getCookie(name) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Returns truthy when authenticated (for guards). Token is in httpOnly cookie. */
export function getAuthToken() {
  return getAuthUserName() ? "authenticated" : null;
}

export function getAuthUserName() {
  const raw = getCookie(USER_COOKIE);
  if (!raw) return null;
  try {
    const user = JSON.parse(raw);
    return user?.name || user?.fullName || user?.username || null;
  } catch {
    return null;
  }
}

/** Sign out - clears cookies via our proxy */
export async function signOut() {
  await fetch("/api/auth/signout", {
    method: "POST",
    credentials: "include",
  });
}

/** @deprecated Use signOut() */
export function clearAuthToken() {
  signOut();
}

/**
 * Refresh access token - calls our proxy.
 */
export async function refreshAccessToken() {
  const res = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 429) {
    throw new Error(data?.message || "Too many requests. Please wait a moment.");
  }

  if (!res.ok || !data?.success) {
    throw new Error(data?.message || "Session expired. Please sign in again.");
  }

  return true;
}

/**
 * Hook for auth state.
 */
export function useAuth(options = {}) {
  const router = useRouter();
  const [userName, setUserName] = useState(null);
  const [mounted, setMounted] = useState(false);
  const redirectToSignIn = options.redirectToSignIn ?? false;

  useEffect(() => {
    setMounted(true);
    const name = getAuthUserName();
    setUserName(name);
    if (redirectToSignIn && !name) {
      router.push("/sign-in");
    }
  }, [router, redirectToSignIn]);

  const isAuthenticated = !!getAuthUserName();
  return {
    /** Truthy when authenticated (for !token guards). Token is in httpOnly cookie. */
    token: isAuthenticated ? "authenticated" : null,
    userName,
    isLoading: !mounted,
    isAuthenticated,
  };
}
