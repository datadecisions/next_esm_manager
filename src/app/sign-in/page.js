"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "../../components/ThemeToggle";
import { authenticate } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
          className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 bg-background">

      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            NOVA
          </h1>
          <p className="mt-1 text-sm font-medium uppercase tracking-[0.2em] text-primary">
            Manager
          </p>
          <p className="mt-4 text-muted-foreground">
            Sign in to access your dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="space-y-2">
              <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
              {attemptsRemaining !== null && attemptsRemaining <= 3 && (
                <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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
              className="h-11 rounded-xl bg-background/80 px-4 py-3"
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
              className="h-11 rounded-xl bg-background/80 px-4 py-3"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl h-11 px-4 py-3 font-semibold active:scale-[0.98]"
          >
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-8 text-center">
          <a
            href="https://support.esm.datadecisions.net/"
            className="text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            Support
          </a>
        </p>
      </div>
    </div>
  );
}
