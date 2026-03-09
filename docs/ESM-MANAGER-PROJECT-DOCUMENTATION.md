# ESM Manager – Next.js App Documentation

**Project:** esm-manager (Data Decisions / ESM)  
**Repository:** datadecisions/next_esm_manager (GitHub)  
**Stack:** Next.js 16, React 19, Tailwind CSS 4  
**Last updated:** March 2025

---

## 1. Project Overview

### 1.1 Stakeholder & Decision Context

Key decisions from leadership (Feb–Mar 2025):

| Decision | Details |
|----------|---------|
| **React/Next migration** | Modernize while porting; use AI assistant to speed up migration |
| **Keep existing API** | No backend changes; new app hits same ESM API endpoints |
| **Separate repos** | Manager and Tech apps as separate Next.js projects (not monorepo) |
| **Move from Bitbucket** | GitHub for manager (`datadecisions/next_esm_manager`) and tech app |
| **API exposure** | Expose current endpoints (e.g. `https://esm.datadecisions.net/api/v1/...`) for Next.js apps to hit directly |
| **Tech app** | Port BBSI time-tracking app; labor module on homepage |
| **Module order** | Accounting GL (DONE) → Work Order → PO → Parts |

### 1.2 Background & Migration Context

The ESM Manager app is a **React/Next.js** rewrite of the legacy Angular-based manager application. The migration was initiated to:

- **Modernize the stack** – Move from Angular to React/Next.js
- **Keep the existing API** – No backend changes; the new app calls the same ESM API (e.g. `https://esm.datadecisions.net/api/v1/...`)
- **Port modules incrementally** – Implementation order: **Accounting GL (DONE) → Work Order → PO → Parts**
- **Use AI-assisted development** – Speed up porting with AI assistants
- **Move from Bitbucket to GitHub**

### 1.3 Architecture

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS 4
- **Backend:** Existing ESM Node.js API (unchanged)
- **Auth:** httpOnly cookies set by Next.js API routes; client never sees tokens (XSS-safe)
- **API Proxy:** Next.js routes proxy `/api/v1/*` and `/api/auth/*` to the ESM backend with token forwarding

---

## 2. What’s Been Built

### 2.1 Modules & Pages

| Module | Route | Status | Notes |
|--------|-------|--------|-------|
| **Home** | `/`, `/home` | ✅ | Dashboard with navigation cards |
| **Sign-in** | `/sign-in` | ✅ | Username/password, rate limiting |
| **Accounting** | `/accounting` | ✅ | Hub + sub-modules |
| Accounting Dashboard | `/accounting/dashboard` | ✅ | Summary charts |
| Chart of Accounts | `/accounting/chart` | ✅ | |
| Budget | `/accounting/budget` | ✅ | |
| Reports | `/accounting/reports` | ✅ | Balance Sheet, Cash Flow |
| Manual Journal | `/accounting/journal` | ✅ | |
| Equipment Ledger | `/accounting/equipment` | ✅ | |
| Customer AR | `/accounting/customer` | ✅ | |
| AR History | `/accounting/ar-history` | ✅ | |
| Bank Reconciliation | `/accounting/reconciliation` | ✅ | |
| WIP & Daily Reports | `/accounting/operations-reports` | ✅ | |
| **Work Orders** | `/work-orders` | ✅ | Hub + sub-modules |
| Create WO | `/work-orders/create` | ✅ | |
| WO Detail | `/work-orders/[id]` | ✅ | Tabs: Order, Parts, Documents, etc. |
| Recurring Orders | `/work-orders/recurring` | ✅ | |
| Reports Dashboard | `/work-orders/reports` | ✅ | Interactive reports |
| Workflow | `/work-orders/workflow` | ✅ | |
| Distribute | `/work-orders/distribute` | ✅ | |
| Credit | `/work-orders/credit` | ✅ | |
| **Purchase Orders** | `/purchase-orders` | ✅ | |
| Open POs | `/purchase-orders/open` | ✅ | |
| PO Detail | `/purchase-orders/[id]` | ✅ | |
| Back Orders | `/purchase-orders/back-orders` | ✅ | |
| Restock | `/purchase-orders/restock` | ✅ | |
| **Parts** | `/parts` | ✅ | Hub + sub-modules |
| Warehouse | `/parts/warehouse` | ✅ | |
| Inventory | `/parts/inventory/tables` | ✅ | |
| KPI | `/parts/kpi` | ✅ | |
| Approval | `/parts/approval` | ✅ | |
| Assembly | `/parts/assembly`, `/parts/assembly/[id]` | ✅ | |
| Scan, Receive, Transfer, Count, Upload, Avg Cost | Various | ✅ | |
| **Labor** | `/labor` | ✅ | Hub + sub-modules |
| Approval | `/labor/approval` | ✅ | Import posted labor, Edit Posted Labor dialog |
| Timecards | `/labor/timecards` | ✅ | Document center – view PDFs grouped by tech |
| KPI Dashboard | `/labor/kpi` | ✅ | Pending, open value, hours billed, utilization, aging |

### 2.2 Key Features

- **Branch/Dept filter** – Shared across reports, persisted in `localStorage`
- **API proxy** – `/api/v1/*` forwards to ESM backend with `x-access-token`
- **Image proxy** – `/api/proxy/image` for binary docs (PDFs, images) to avoid CORS and binary corruption
- **Binary response handling** – Proxy uses `isBinaryContentType()` for ZIP, PDF, images
- **Edit Posted Labor** – Transfer to new WO, assign mechanic, times, section, comments
- **Timecard Document Center** – View signed timecard PDFs by technician, Export ZIP
- **Labor KPI Dashboard** – Pending approval, open labor value, hours billed, billable %, overtime %, open orders aging

---

## 3. Test Suite

### 3.1 Unit & Integration Tests (Vitest)

- **Runner:** Vitest 4
- **Config:** `vitest.config.mjs`
- **Command:** `pnpm test` (watch) / `pnpm test:run` (single run)

**Test files:**

| File | Coverage |
|------|----------|
| `src/lib/__tests__/apiRouteAuth.test.js` | Auth token extraction, requireAuth |
| `src/lib/__tests__/format.test.js` | Format helpers |
| `src/lib/__tests__/rateLimit.test.js` | Rate limiting |
| `src/lib/__tests__/proxyHelpers.test.js` | `isBinaryContentType` |
| `src/app/api/proxy/__tests__/image.test.js` | Image proxy routing |
| `src/app/api/auth/__tests__/login.test.js` | Login API |
| `src/app/api/auth/__tests__/refresh.test.js` | Token refresh API |
| `src/app/api/auth/__tests__/signout.test.js` | Sign-out API |

### 3.2 E2E Tests (Playwright)

- **Runner:** Playwright 1.58
- **Config:** `playwright.config.js`
- **Command:** `pnpm test:e2e` / `pnpm test:e2e:ui`

**Projects:**

- **setup** – Auth setup (sign-in, save storage state)
- **chromium** – Unauthenticated flows (sign-in, auth redirect)
- **chromium-authenticated** – Authenticated flows (depends on setup)
- **firefox**, **webkit** – Cross-browser (unauthenticated only)

**Spec files:**

| File | Flows |
|------|-------|
| `e2e/auth-flow.spec.js` | Sign-out, protected route redirect |
| `e2e/sign-in.spec.js` | Sign-in form |
| `e2e/home.authenticated.spec.js` | Home load, nav to sections |
| `e2e/work-orders.authenticated.spec.js` | WO list, create, view detail |
| `e2e/purchase-orders.authenticated.spec.js` | PO flows |
| `e2e/parts.authenticated.spec.js` | Parts flows |
| `e2e/labor.authenticated.spec.js` | Labor flows |

**E2E flow tracker:** `e2e/E2E-FLOWS.md` – P0/P1/P2 flows with mocks and assertions.

---

## 4. CI Pipeline

**Location:** `.github/workflows/test.yml`

**Triggers:**

- Push to `main` / `master`
- Pull requests to `main` / `master`
- Scheduled daily at 6:00 UTC

**Jobs:**

| Job | Steps |
|-----|-------|
| **Lint** | `pnpm install --frozen-lockfile` → `pnpm run lint` |
| **Build** | `pnpm install` → `pnpm build` |
| **Unit** | `pnpm install` → `pnpm test:run` |
| **E2E** | Only on push to main/master or schedule; `playwright install --with-deps chromium` → `pnpm test:e2e --project=chromium` |

**Node:** 20  
**Package manager:** pnpm 9

---

## 5. Sentry

### 5.1 Configuration

- **Package:** `@sentry/nextjs` ^10.42.0
- **Project:** `nova-manager` (org: `datadecisionsinc`)
- **Config files:** `sentry.server.config.js`, `sentry.edge.config.js`
- **Next.js:** `withSentryConfig()` in `next.config.mjs`

### 5.2 Settings

- **DSN:** `https://da51a36cf9216f1646ccdb3c617fe039@o4511001875316736.ingest.us.sentry.io/4511006201872384`
- **Traces sample rate:** 1
- **Logs:** Enabled
- **PII:** `sendDefaultPii: true`
- **Source maps:** `widenClientFileUpload: true`
- **Vercel Cron monitors:** Enabled (automatic instrumentation)

---

## 6. PostHog (Planned)

**Status:** Not yet implemented – requires company credit card to add a new PostHog project.

**Intended use:**

- Product analytics
- Feature flags
- Session recordings
- A/B testing

**Next steps:** Obtain approval and card access to create a PostHog project, then add the PostHog SDK and initialize in the app.

---

## 7. Environment & Deployment

### 7.1 Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | ESM API base URL (e.g. `https://esm.datadecisions.net` or `http://localhost:3001`) |

**Example:** `.env.example` → copy to `.env.local`

### 7.2 Local Development

1. Set `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:3001`)
2. Run ESM server (esm-server) for API
3. Run `pnpm dev` for Next.js
4. App: http://localhost:3000

### 7.3 Deployment

- **Platform:** Vercel (recommended for Next.js)
- **Build:** `pnpm build`
- **Start:** `pnpm start` (or Vercel’s default)

---

## 8. Technical Notes

### 8.1 Known Issues & Dependencies

- **Signature pad:** Some packages (e.g. signature capture) are outdated; blacked-out signatures are a known issue (see package issues).
- **Migration order:** Accounting GL → Work Order → PO → Parts (per implementation plan).
- **Auth middleware:** `src/proxy.js` contains auth redirect logic (redirect unauthenticated users to `/sign-in`). Next.js only runs middleware from `middleware.js` or `middleware.ts`. To enable server-side auth redirects before page render, rename to `src/middleware.js` and export the proxy function as default.

### 8.2 API Proxy Behavior

- **JSON:** Uses `res.text()` then `JSON.parse`
- **Binary (ZIP, PDF, images):** Uses `res.arrayBuffer()` via `isBinaryContentType()` to avoid corruption
- **Auth:** Forwards `x-access-token` from cookie to ESM backend

### 8.3 Auth Flow

1. User signs in at `/sign-in` → `POST /api/auth/login` → proxy to ESM authenticate
2. Server sets `auth_token` (httpOnly) and `auth_user` (user info)
3. All `/api/v1/*` requests use `credentials: "include"`; proxy adds token from cookie
4. 401 → refresh via `/api/auth/refresh` → retry once

---

## 9. File Structure (Key Paths)

```
esm-manager/
├── .github/workflows/test.yml    # CI
├── e2e/                          # Playwright E2E
│   ├── E2E-FLOWS.md
│   ├── auth-flow.spec.js
│   ├── *.authenticated.spec.js
│   └── .auth/                    # Storage state (gitignored)
├── src/
│   ├── app/
│   │   ├── api/                  # Next.js API routes
│   │   │   ├── auth/             # login, refresh, signout, me
│   │   │   ├── proxy/image/      # Binary image/PDF proxy
│   │   │   └── v1/[[...path]]/   # API proxy to ESM
│   │   ├── accounting/
│   │   ├── labor/
│   │   ├── parts/
│   │   ├── purchase-orders/
│   │   ├── work-orders/
│   │   ├── sign-in/
│   │   └── page.js, layout.js
│   ├── components/
│   │   ├── BranchDeptFilter.jsx
│   │   ├── ui/                   # shadcn components
│   │   └── work-order/
│   ├── lib/
│   │   ├── api/                  # labor, work-order, accounting, etc.
│   │   ├── auth.js
│   │   ├── api.js
│   │   ├── proxyHelpers.js
│   │   └── __tests__/
│   └── proxy.js                  # Auth redirect logic (rename to middleware.js to activate)
├── sentry.server.config.js
├── sentry.edge.config.js
├── next.config.mjs
├── vitest.config.mjs
├── playwright.config.js
└── package.json
```

---

## 10. Summary

The ESM Manager Next.js app is a modern replacement for the Angular manager app, with:

- **Accounting, Work Orders, Purchase Orders, Parts, and Labor** modules ported
- **Vitest** unit tests and **Playwright** E2E tests
- **GitHub Actions** CI (lint, build, unit, E2E)
- **Sentry** for error monitoring and performance
- **PostHog** planned for product analytics (pending billing setup)
- **API proxy** that preserves binary responses and forwards auth

The existing ESM API remains unchanged; the new app consumes it through the Next.js proxy.
