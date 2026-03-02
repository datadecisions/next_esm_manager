"use client";

import { useRouter } from "next/navigation";
import { ThemeToggle } from "../../components/ThemeToggle";

export default function SignIn() {
  const router = useRouter();

  function handleSubmit(e) {
    e.preventDefault();
    router.push("/home");
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
            ESM <span className="bg-gradient-to-r from-cyan-500 to-sky-500 bg-clip-text text-transparent">NOVA</span>
          </h1>
          <p className="mt-1 text-sm font-medium uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400/80">
            Manager
          </p>
          <p className="mt-4 text-slate-500 dark:text-slate-400">Sign in to access your dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="sr-only">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="Username"
              required
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
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 dark:border-slate-700/50 dark:bg-slate-900/50 dark:text-white dark:placeholder-slate-500"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 px-4 py-3 font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:from-cyan-400 hover:to-sky-400 hover:shadow-cyan-400/30 active:scale-[0.98]"
          >
            Sign in
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
