import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NODE_ENV === "development") {
    // Do not initialize Sentry when running the local dev server
    return;
  }

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
