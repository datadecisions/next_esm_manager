"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "../../components/ThemeToggle";
import DataDecisionsLogo from "@/components/icons/DataDecisionsLogo";
import { authenticate } from "@/lib/api";
import { Input } from "@/components/ui/input";

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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-ring border-t-transparent"
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col px-4">
      <div className="fixed right-4 top-4 z-20">
        <ThemeToggle />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
      <div className="relative mx-auto w-full max-w-md">
        <div className="rounded-3xl border border-border/50 bg-background/95 p-8 shadow-2xl backdrop-blur-md dark:bg-background dark:backdrop-blur-0">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 inline-flex items-center justify-center rounded-xl border border-border/60 bg-background/70 p-2 shadow-xs">
              <DataDecisionsLogo
                className="h-9 w-9 text-primary"
                aria-label="NOVA"
                role="img"
              />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              <span className="text-primary">NOVA</span>
              <span className="ml-1.5 text-muted-foreground">· Manager</span>
            </h1>
            <p className="mt-1 text-base font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Manager
            </p>
            <p className="mt-4 text-base text-muted-foreground">
              Sign in to access your dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="space-y-2">
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
                {attemptsRemaining !== null && attemptsRemaining <= 3 && (
                  <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
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
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="Username"
                required
                disabled={loading}
                autoComplete="username"
                className="h-11 bg-card px-4"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Password"
                required
                disabled={loading}
                autoComplete="current-password"
                className="h-11 bg-card px-4"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary px-4 py-3.5 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-8 text-center">
            <a
              href="https://support.esm.datadecisions.net/"
              className="text-sm text-muted-foreground transition-colors hover:text-accent"
            >
              Support
            </a>
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
