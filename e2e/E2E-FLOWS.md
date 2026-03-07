# E2E Flows Tracker

Track progress as we build out E2E tests. Check off items as they're completed.

---

## P0 – Auth & Core Navigation

| # | Flow | Status | Spec File |
|---|------|--------|-----------|
| 1 | Sign-out flow | ☑ | `auth-flow.spec.js` |
| 2 | Protected route redirect (unauthenticated → sign-in) | ☑ | `auth-flow.spec.js` |
| 3 | Home loads when authenticated | ☑ | `home.authenticated.spec.js` |
| 4 | Navigation to main sections (Accounting, Parts, PO, WO) | ☑ | `home.authenticated.spec.js` |

---

## P1 – Core Business Flows

| # | Flow | Status | Spec File |
|---|------|--------|-----------|
| 5 | Work orders list loads | ⬜ | |
| 6 | Create work order | ⬜ | |
| 7 | View work order detail | ⬜ | |
| 8 | Parts hub loads & search | ⬜ | |
| 9 | Create assembly | ⬜ | |
| 10 | Parts approval | ⬜ | |
| 11 | Purchase orders list loads | ⬜ | |
| 12 | Back orders → create PO | ⬜ | |

---

## P2 – Secondary Flows

| # | Flow | Status | Spec File |
|---|------|--------|-----------|
| 13 | Accounting dashboard loads | ⬜ | |
| 14 | Chart of accounts & create account | ⬜ | |
| 15 | Restock PO flow | ⬜ | |
| 16 | Receive parts | ⬜ | |
| 17 | Inventory count | ⬜ | |

---

## P3 – Edge Cases & Polish

| # | Flow | Status | Spec File |
|---|------|--------|-----------|
| 18 | 404 page | ⬜ | |
| 19 | API error handling | ⬜ | |
| 20 | Form validation feedback | ⬜ | |

---

## Done

| Flow | Spec File |
|------|-----------|
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

- Use `page.route()` to mock APIs for deterministic tests
- Consider adding an auth fixture (`storageState`) for authenticated flows
- CI runs E2E on push to main/master and daily schedule (chromium only)
