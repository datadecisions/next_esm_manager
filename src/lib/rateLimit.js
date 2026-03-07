/**
 * In-memory rate limiter for auth endpoints.
 * Keyed by IP. Resets on server restart (fine for single-instance).
 */

const store = new Map();

function getClientIp(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function check(key, maxAttempts, windowMs) {
  const now = Date.now();
  let data = store.get(key);

  if (!data) {
    data = { count: 0, firstAt: now };
    store.set(key, data);
  }

  if (now - data.firstAt > windowMs) {
    data = { count: 0, firstAt: now };
    store.set(key, data);
  }

  data.count += 1;
  const remaining = Math.max(0, maxAttempts - data.count);
  const limited = data.count > maxAttempts;

  if (limited) {
    const retryAfter = Math.ceil((data.firstAt + windowMs - now) / 1000);
    return { limited: true, remaining: 0, retryAfter };
  }

  return { limited: false, remaining };
}

function reset(key) {
  store.delete(key);
}

export const loginLimiter = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  check(request) {
    const ip = getClientIp(request);
    return check(`login:${ip}`, this.maxAttempts, this.windowMs);
  },
  reset(request) {
    const ip = getClientIp(request);
    reset(`login:${ip}`);
  },
};

export const refreshLimiter = {
  maxAttempts: 30,
  windowMs: 60 * 1000,
  check(request) {
    const ip = getClientIp(request);
    return check(`refresh:${ip}`, this.maxAttempts, this.windowMs);
  },
};
