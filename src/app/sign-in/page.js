"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "../../components/ThemeToggle";
import { authenticate } from "@/lib/api";

export default function SignIn() {
  const router = useRouter();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);
  const [retryAfter, setRetryAfter] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((user) => {
        if (user?.username || user?.name) {
          const from = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("from");
          router.replace(from && from.startsWith("/") && from !== "/sign-in" ? from : "/home");
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setAttemptsRemaining(null);
    setRetryAfter(null);
    setLoading(true);
    const form = e.target;
    const username = form.username.value.trim();
    const password = form.password.value;

    try {
      const result = await Promise.race([
        authenticate({ username, password }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timed out. Check the server is running and NEXT_PUBLIC_API_URL is set.")), 15000)
        ),
      ]);

      if (result.success) {
        router.push("/home");
        router.refresh();
      } else {
        setError(result.message ?? "Sign in failed");
      }
    } catch (err) {
      setError(err?.message ?? "Sign in failed");
      setAttemptsRemaining(err?.attemptsRemaining);
      setRetryAfter(err?.retryAfter);
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" aria-hidden />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 to-cyan-50/50 px-4 dark:bg-slate-950">
      <div className="pointer-events-none absolute inset-0 opacity-0 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/30 dark:opacity-100" />
      <div className="pointer-events-none absolute inset-0 opacity-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(6,182,212,0.15),transparent)] dark:opacity-100" />

      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            <span className="bg-gradient-to-r from-cyan-500 to-sky-500 bg-clip-text text-transparent">NOVA</span>
          </h1>
          <p className="mt-1 text-sm font-medium uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400/80">
            Manager
          </p>
          <p className="mt-4 text-slate-500 dark:text-slate-400">Sign in to access your dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="space-y-2">
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
                {error}
              </div>
              {attemptsRemaining !== null && attemptsRemaining <= 3 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
                  {attemptsRemaining === 0 && retryAfter ? (
                    <>
                      <strong>Locked out.</strong> Please try again in {retryAfter} seconds.
                    </>
                  ) : (
                    <>
                      <strong>Attempts remaining:</strong> {attemptsRemaining}
                      {attemptsRemaining === 1
                        ? " — After one more failed attempt, you will be locked out for 15 minutes."
                        : " — Please check your credentials before trying again."}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          <div>
            <label htmlFor="username" className="sr-only">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="Username"
              required
              disabled={loading}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 dark:border-slate-700/50 dark:bg-slate-900/50 dark:text-white dark:placeholder-slate-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Password"
              required
              disabled={loading}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 dark:border-slate-700/50 dark:bg-slate-900/50 dark:text-white dark:placeholder-slate-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 px-4 py-3 font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:from-cyan-400 hover:to-sky-400 hover:shadow-cyan-400/30 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-8 text-center">
          <a
            href="https://support.esm.datadecisions.net/"
            className="text-sm text-slate-500 transition-colors hover:text-cyan-600 dark:hover:text-cyan-400"
          >
            Support
          </a>
        </p>
      </div>
    </div>
  );
}
