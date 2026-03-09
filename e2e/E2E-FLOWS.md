# E2E Critical Flows – Implementation Guide

Track progress as we build out E2E tests. Check off items as they're completed. Each flow includes URLs, APIs to mock, and assertions.

---

## How to Use This Doc

1. **Pick a flow** from P1 or P2.
2. **Create or extend a spec file** (e.g. `work-orders.authenticated.spec.js`).
3. **Mock the APIs** listed in the flow using `page.route()`.
4. **Implement the test** following the assertions.
5. **Check off** the flow in the tracker.

**Auth:** Authenticated flows use `storageState` from `auth.setup.js`. Add your spec to the `chromium-authenticated` project by naming it `*.authenticated.spec.js`.

---

## P0 – Auth & Core Navigation ✅

| # | Flow | Status | Spec File |
|---|------|--------|-----------|
| 1 | Sign-out flow | ☑ | `auth-flow.spec.js` |
| 2 | Protected route redirect (unauthenticated → sign-in) | ☑ | `auth-flow.spec.js` |
| 3 | Home loads when authenticated | ☑ | `home.authenticated.spec.js` |
| 4 | Navigation to main sections (Accounting, Parts, PO, WO) | ☑ | `home.authenticated.spec.js` |

---

## P1 – Core Business Flows

### 5. Work orders list loads

| Field | Value |
|-------|-------|
| **URL** | `/work-orders` |
| **Spec** | `work-orders.authenticated.spec.js` |
| **APIs to mock** | `**/api/v1/work_order/viewed/**` → `[]` |
| **Assertions** | Page title/heading "Work Orders"; action cards visible (Create Work Order, Recurring Orders, etc.); recent orders section loads (empty or mocked) |
| **Status** | ☑ |

**Mock example:**
```js
await page.route("**/api/v1/work_order/viewed/**", (route) =>
  route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
);
```

---

### 6. Create work order

| Field | Value |
|-------|-------|
| **URL** | `/work-orders/create` |
| **Spec** | `work-orders.authenticated.spec.js` |
| **APIs to mock** | `**/api/v1/dispatch/branches`, `**/api/v1/dispatch/dept/*`, `**/api/v1/work_order/create` |
| **Assertions** | Create form loads; branch/dept selectors visible; submit creates WO (mock create API returns success) |
| **Status** | ☑ |

**Mocks needed:**
- `GET /api/v1/dispatch/branches` → `[{ Number: 1, Title: "Main" }]`
- `GET /api/v1/dispatch/dept/1` → `[{ Dept: 10, Title: "Service" }]`
- `POST /api/v1/work_order/create` → `{ WONo: 12345 }` (or similar)

---

### 7. View work order detail

| Field | Value |
|-------|-------|
| **URL** | `/work-orders/12345` (use mocked WO number) |
| **Spec** | `work-orders.authenticated.spec.js` |
| **APIs to mock** | `**/api/v1/work_order/12345`, `**/api/v1/work_order/billing_overview/12345`, `**/api/v1/work_order/viewed/**` |
| **Assertions** | WO number visible; tabs or sections load (Order, Parts, etc.); no redirect to sign-in |
| **Status** | ☑ |

**Mock WO payload (minimal):**
```json
{
  "WONo": 12345,
  "Status": "Open",
  "ShipName": "Test Customer",
  "Branch": 1,
  "Dept": 10
}
```

---

### 8. Parts hub loads & search

| Field | Value |
|-------|-------|
| **URL** | `/parts` |
| **Spec** | `parts.authenticated.spec.js` |
| **APIs to mock** | None for hub. For search: `mockPartsSearch(page, parts?)` |
| **Assertions** | Page loads; action cards visible (KPI Dashboard, Approval, Inventory Tables, Transfer, Receive, Count, Assembly, etc.) |
| **Status** | ☑ |

---

### 9. Create assembly

| Field | Value |
|-------|-------|
| **URL** | `/parts/assembly` |
| **Spec** | `parts.authenticated.spec.js` |
| **APIs to mock** | `mockAssemblies`, `mockCreateAssembly` |
| **Assertions** | Assembly list loads (empty or mocked); Create button opens dialog; dialog has Model/Name fields; submit closes dialog |
| **Status** | ☑ |

**Mocks:**
- `GET /api/v1/parts/assemblies` → `[]` or `[{ id: 1, equipment_name: "Model X", assembly_name: "Assembly A", ... }]`
- `POST /api/v1/parts/assembly/create` → `{}` or `{ id: 1 }`

---

### 10. Parts approval

| Field | Value |
|-------|-------|
| **URL** | `/parts/approval` |
| **Spec** | `parts.authenticated.spec.js` |
| **APIs to mock** | `mockBranchesAndDepts`, `mockRequestedPartsByBranch` |
| **Assertions** | Page loads; branch selector; table of requested parts (or empty state) |
| **Status** | ☑ |

---
E2E for critical flows
### 11. Purchase orders list loads

| Field | Value |
|-------|-------|
| **URL** | `/purchase-orders` |
| **Spec** | `purchase-orders.authenticated.spec.js` |
| **APIs to mock** | None for hub (action cards only) |
| **Assertions** | Page loads; action cards (Open Purchase Orders, Back Ordered Part Requests, Restock) |
| **Status** | ✅ |

---

### 12. Open POs & Back orders → create PO

| Field | Value |
|-------|-------|
| **URL** | `/purchase-orders/open`, `/purchase-orders/back-orders` |
| **Spec** | `purchase-orders.authenticated.spec.js` |
| **APIs to mock** | `**/api/v1/dispatch/branches`, `**/api/v1/dispatch/dept/*`, `**/api/v1/purchase_order/open/*`, `**/api/v1/purchase_order/all_back_orders` |
| **Assertions** | Open POs: branch/dept filter, table of POs (or empty); Back orders: table loads, select parts, create PO button |
| **Status** | ✅ |

**Open POs mock:**
- `GET /api/v1/dispatch/branches` → `[{ Number: 1, Title: "Main" }]`
- `GET /api/v1/dispatch/dept/1` → `[{ Dept: 10, Title: "Service" }]`
- `GET /api/v1/purchase_order/open/10/1` → `[{ PONo: "PO-001", VendorNo: "V1", OrderDate: "2025-03-01", ... }]`

---

### 13. Labor hub loads & approval

| Field | Value |
|-------|-------|
| **URL** | `/labor`, `/labor/approval`, `/labor/timecards` |
| **Spec** | `labor.authenticated.spec.js` (to add) |
| **APIs to mock** | `**/api/v1/labor/approval/pending/*`, `**/api/v1/labor/timecards*` |
| **Assertions** | Labor hub loads; Approval and Timecards action cards visible; Approval: branch filter, table of pending labor; Timecards: date range, table of timecards |
| **Status** | ⬜ |

---

## P2 – Secondary Flows

### 14. Accounting dashboard loads

| Field | Value |
|-------|-------|
| **URL** | `/accounting/dashboard` |
| **Spec** | `accounting.authenticated.spec.js` |
| **APIs to mock** | `**/api/v1/accounting/sales`, `**/api/v1/accounting/expenses`, `**/api/v1/accounting/overdue` |
| **Assertions** | Dashboard loads; charts or summary sections visible |
| **Status** | ⬜ |

---

### 15. Chart of accounts & create account

| Field | Value |
|-------|-------|
| **URL** | `/accounting/chart` |
| **Spec** | `accounting.authenticated.spec.js` |
| **APIs to mock** | `**/api/v1/accounting/accounts`, `**/api/v1/accounting/chart/account/create` |
| **Assertions** | Accounts list/table loads; Create Account button opens dialog |
| **Status** | ⬜ |

---

### 16. Restock PO flow

| Field | Value |
|-------|-------|
| **URL** | `/purchase-orders/restock` |
| **Spec** | `purchase-orders.authenticated.spec.js` |
| **APIs to mock** | `**/api/v1/dispatch/branches`, `**/api/v1/dispatch/dept/*`, restock-specific APIs (check `purchase-order.js`) |
| **Assertions** | Page loads; branch/dept filter; restock table or list |
| **Status** | ⬜ |

---

### 17. Receive parts

| Field | Value |
|-------|-------|
| **URL** | `/parts/receive` |
| **Spec** | `parts.authenticated.spec.js` |
| **APIs to mock** | Receive flow APIs (see `@/lib/api/purchase-order` – `receive` etc.) |
| **Assertions** | Page loads; receive UI visible |
| **Status** | ⬜ |

---

### 18. Inventory count

| Field | Value |
|-------|-------|
| **URL** | `/parts/count` |
| **Spec** | `parts.authenticated.spec.js` |
| **APIs to mock** | `**/api/v1/parts/active_counts`, `**/api/v1/parts/warehouses` (or similar) |
| **Assertions** | Page loads; count UI or "New Count" button |
| **Status** | ⬜ |

---

## P3 – Edge Cases & Polish

### 19. 404 page

| Field | Value |
|-------|-------|
| **URL** | `/nonexistent-page-xyz` |
| **Spec** | `example.spec.js` or `error-pages.spec.js` |
| **APIs to mock** | None |
| **Assertions** | Page shows 404 or "not found" content |
| **Status** | ⬜ |

---

### 20. API error handling

| Field | Value |
|-------|-------|
| **URL** | Any page that fetches data |
| **Spec** | Add to existing specs |
| **APIs to mock** | Return 500 or 401 for a specific endpoint |
| **Assertions** | Error message or toast visible; no uncaught crash |
| **Status** | ⬜ |

---

### 21. Form validation feedback

| Field | Value |
|-------|-------|
| **URL** | e.g. `/work-orders/create`, `/sign-in` |
| **Spec** | Add to existing specs |
| **APIs to mock** | N/A (client-side validation) |
| **Assertions** | Required fields show validation on submit |
| **Status** | ⬜ |

---

## Shared Mock Helpers ☑

**Location:** `e2e/helpers/mocks.js`

| Helper | Use for |
|--------|---------|
| `mockBranchesAndDepts(page)` | Pages with BranchDeptFilter (work orders, POs, parts approval, restock) |
| `mockWorkOrderViewed(page, orders?)` | Work orders list, any page that fetches recent WOs |
| `mockOpenPurchaseOrders(page, orders?)` | `/purchase-orders/open` |
| `mockRequestedPartsByBranch(page, requests?)` | /parts/approval |
| `mockPartsSearch(page, parts?)` | Parts search on /parts hub |
| `mockAssemblies(page, assemblies?)` | `/parts/assembly` |
| `mockCreateAssembly(page, assembly?)` | Create assembly submit |
| `mockSalesCodes(page, codes?)` | Create work order form (Type of Sale) |
| `mockCustomerForCreate(page, customer?)` | Create work order form (Ship To, Bill To) |
| `mockCreateWO(page, wo?)` | Create work order submit |
| `mockWorkOrderDetail(page, woNo?, wo?, billing?)` | View work order detail page |
| `mockAuthEndpoints(page)` | Auth me/refresh – prevents redirects when backend is down |

**Usage:**
```js
const { mockBranchesAndDepts, mockWorkOrderViewed } = require("./helpers/mocks");

test.beforeEach(async ({ page }) => {
  await mockWorkOrderViewed(page);
  await mockBranchesAndDepts(page);  // if page has branch/dept filter
});
```

---

## API Reference (Quick Lookup)

| Domain | Key endpoints |
|--------|----------------|
| **Auth** | `/api/auth/login`, `/api/auth/signout`, `/api/auth/refresh`, `/api/auth/me` |
| **Dispatch** | `/api/v1/dispatch/branches`, `/api/v1/dispatch/dept/:branch` |
| **Work order** | `/api/v1/work_order/viewed/:n`, `/api/v1/work_order/:woNo`, `/api/v1/work_order/create` |
| **Purchase order** | `/api/v1/purchase_order/open/:dept/:branch`, `/api/v1/purchase_order/all_back_orders` |
| **Parts** | `/api/v1/parts/assemblies`, `/api/v1/parts/assembly/create`, `/api/v1/parts/requested_branch/:branch` |
| **Labor** | `/api/v1/labor/approval/pending/:branch`, `/api/v1/labor/timecards`, `/api/v1/labor/approval/approve` |
| **Accounting** | `/api/v1/accounting/sales`, `/api/v1/accounting/accounts` |

---

## Done

| Flow | Spec File |
|------|-----------|
| Shared mock helpers | `e2e/helpers/mocks.js` |
| Work orders list loads (#5) | `work-orders.authenticated.spec.js` |
| Create work order (#6) | `work-orders.authenticated.spec.js` |
| View work order detail (#7) | `work-orders.authenticated.spec.js` |
| Parts hub loads & search (#8) | `parts.authenticated.spec.js` |
| Create assembly (#9) | `parts.authenticated.spec.js` |
| Parts approval (#10) | `parts.authenticated.spec.js` |
| Sign-in page loads | `example.spec.js` |
| Root redirects to sign-in | `example.spec.js` |
| Invalid credentials error | `sign-in.spec.js` |
| Successful sign-in → home | `sign-in.spec.js` |
| Loading state while signing in | `sign-in.spec.js` |
| Sign-out → redirects to sign-in | `auth-flow.spec.js` |
| Cannot access protected route after sign-out | `auth-flow.spec.js` |
| Protected redirect: /parts, /work-orders, /accounting, /purchase-orders | `auth-flow.spec.js` |
| Home loads when authenticated | `home.authenticated.spec.js` |
| Navigation to main sections (Accounting, Parts, PO, WO) | `home.authenticated.spec.js` |

---

## Notes

- Use `page.route()` to mock APIs for deterministic tests.
- Authenticated specs: name `*.authenticated.spec.js` and they run with `storageState` from `auth.setup.js`.
- CI runs E2E on push to main/master and daily schedule (chromium only).
- For pages that need branch/dept: mock `dispatch/branches` and `dispatch/dept/:branch` first.
