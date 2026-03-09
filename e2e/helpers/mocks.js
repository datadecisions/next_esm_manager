// @ts-check
/**
 * Shared E2E mock helpers. Use in beforeEach or individual tests.
 * All helpers use page.route() to intercept and fulfill API requests.
 */

const defaultBranches = [{ Number: 1, Title: "Main", Name: "Main" }];
const defaultDepts = [{ Dept: 10, Title: "Service", Branch: 1 }];

/**
 * Mock branches and departments. Required for pages with BranchDeptFilter
 * (work orders, purchase orders, parts approval, restock, etc.).
 * @param {import("@playwright/test").Page} page
 */
async function mockBranchesAndDepts(page) {
  await page.route("**/api/v1/dispatch/branches", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(defaultBranches),
    })
  );
  await page.route("**/api/v1/dispatch/dept/*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(defaultDepts),
    })
  );
}

/**
 * Mock auth endpoints (me, refresh). Use in authenticated tests so the app
 * doesn't hit the real backend when validating sessions. Prevents redirects
 * when backend is down.
 * @param {import("@playwright/test").Page} page
 */
async function mockAuthEndpoints(page) {
  const userPayload = { name: "Test User", fullName: "Test User", username: "testuser" };
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(userPayload),
    })
  );
  await page.route("**/api/auth/refresh", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, token: "test-token" }),
    })
  );
}

/**
 * Mock work order "viewed" endpoint. Returns empty array so work order list
 * pages don't 401. Use for /work-orders and any page that fetches recent WOs.
 * @param {import("@playwright/test").Page} page
 * @param {Array} [orders] - Optional. Defaults to [].
 */
async function mockWorkOrderViewed(page, orders = []) {
  await page.route("**/api/v1/work_order/viewed/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(orders),
    })
  );
}

/**
 * Mock open purchase orders for a branch/dept. Use for /purchase-orders/open.
 * @param {import("@playwright/test").Page} page
 * @param {Array} [orders] - Optional. Defaults to [].
 */
async function mockOpenPurchaseOrders(page, orders = []) {
  await page.route("**/api/v1/purchase_order/open/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(orders),
    })
  );
}

/**
 * Mock all back orders. Use for /purchase-orders/back-orders.
 * @param {import("@playwright/test").Page} page
 * @param {Array} [parts] - Optional. Defaults to [].
 */
async function mockAllBackOrders(page, parts = []) {
  await page.route("**/api/v1/purchase_order/all_back_orders**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(parts),
    })
  );
}

/**
 * Mock requested parts by branch. Use for /parts/approval.
 * @param {import("@playwright/test").Page} page
 * @param {Array} [requests] - WOs with Parts. Defaults to [].
 */
async function mockRequestedPartsByBranch(page, requests = []) {
  await page.route("**/api/v1/parts/requested_branch/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(requests),
    })
  );
}

/**
 * Mock parts search (search_all). Use for PartsSearchCombobox on /parts.
 * @param {import("@playwright/test").Page} page
 * @param {Array} [parts] - Optional. Defaults to [].
 */
async function mockPartsSearch(page, parts = []) {
  await page.route("**/api/v1/parts/search_all/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(parts),
    })
  );
}

/**
 * Mock assemblies list. Use for /parts/assembly.
 * @param {import("@playwright/test").Page} page
 * @param {Array} [assemblies] - Optional. Defaults to [].
 */
async function mockAssemblies(page, assemblies = []) {
  await page.route("**/api/v1/parts/assemblies", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(assemblies),
    })
  );
}

/**
 * Mock create assembly. Intercepts POST and returns success.
 * @param {import("@playwright/test").Page} page
 * @param {object} [assembly] - Created assembly. Defaults to { id: 1 }.
 */
async function mockCreateAssembly(page, assembly = { id: 1 }) {
  await page.route("**/api/v1/parts/assembly/create", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(assembly),
      });
    } else {
      await route.continue();
    }
  });
}

/** Default sales code for create WO form */
const defaultSalesCodes = [{ Code: "SVC", GeneralDescription: "Service", Description: "Service" }];

/**
 * Mock sales codes. Required for create work order form (Type of Sale).
 * @param {import("@playwright/test").Page} page
 * @param {Array} [codes] - Optional. Defaults to one service code.
 */
async function mockSalesCodes(page, codes = defaultSalesCodes) {
  await page.route("**/api/v1/customer/sales_codes/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(codes),
    })
  );
}

/** Default customer for create WO (Ship To = Bill To) */
const defaultCustomer = {
  Number: "C001",
  Name: "Test Customer",
  BillTo: "C001",
  ShipName: "Test Customer",
  Address: "123 Main St",
  City: "Anytown",
  State: "CA",
};

/**
 * Mock customer search and getCustomerByNum. For create work order form.
 * Register getCustomerByNum first, then search (search is more specific).
 * @param {import("@playwright/test").Page} page
 * @param {object} [customer] - Customer to return. Defaults to defaultCustomer.
 */
async function mockCustomerForCreate(page, customer = defaultCustomer) {
  const cust = { ...defaultCustomer, ...customer };
  const num = String(cust.Number ?? cust.number ?? "C001");
  // getCustomerByNum: /api/v1/customer/{num} (register first, broader)
  await page.route("**/api/v1/customer/" + num + "**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(cust),
    })
  );
  // search: /api/v1/customer/search/* (register last, checked first)
  await page.route("**/api/v1/customer/search/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([cust]),
    })
  );
}

/**
 * Mock create work order. Intercepts POST and returns created WO.
 * @param {import("@playwright/test").Page} page
 * @param {{ WONo: number }} [wo] - Created WO. Defaults to { WONo: 12345 }.
 */
async function mockCreateWO(page, wo = { WONo: 12345 }) {
  await page.route("**/api/v1/work_order/create", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(wo),
      });
    } else {
      await route.continue();
    }
  });
}

/** Default WO for detail page */
const defaultWorkOrder = {
  WONo: 12345,
  Status: "Open",
  ShipName: "Test Customer",
  ShipTo: "C001",
  BillTo: "C001",
  Branch: 1,
  Dept: 10,
};

/** Default billing overview for WO detail */
const defaultBillingOverview = {
  calculations: {
    sales: { parts: 0, labor: 0, misc: 0, equipment: 0, rental: 0 },
    subTotal: 0,
    tax: 0,
    balance: 0,
  },
  lineItems: [],
};

/**
 * Mock work order detail page. Mocks getWO, getBillingOverview, getCustomerByNum,
 * and images metadata for doc count.
 * @param {import("@playwright/test").Page} page
 * @param {number|string} [woNo] - WO number. Defaults to 12345.
 * @param {object} [wo] - Work order payload. Defaults to defaultWorkOrder.
 * @param {object} [billing] - Billing overview. Defaults to defaultBillingOverview.
 */
async function mockWorkOrderDetail(page, woNo = 12345, wo = defaultWorkOrder, billing = defaultBillingOverview) {
  const id = String(woNo);
  const woPayload = { ...defaultWorkOrder, ...wo, WONo: wo.WONo ?? woNo };

  // getWO: /api/v1/work_order/{id} (does not match billing_overview or images_metadata paths)
  await page.route(`**/api/v1/work_order/${id}`, (route) => {
    const url = route.request().url();
    if (url.includes("billing_overview") || url.includes("images_metadata")) return route.continue();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(woPayload),
    });
  });
  await page.route(`**/api/v1/work_order/billing_overview/${id}**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(billing),
    })
  );
  await page.route("**/api/v1/work_order/images_metadata/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  );
  await page.route("**/api/v1/customer/images_metadata/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  );

  const billTo = String(woPayload.BillTo ?? woPayload.billTo ?? "");
  if (billTo) {
    const cust = { Number: billTo, Name: woPayload.ShipName ?? "Test Customer", BillTo: billTo };
    await page.route(`**/api/v1/customer/${billTo}**`, (route) => {
      const url = route.request().url();
      if (url.includes("/search/") || url.includes("/images_metadata/")) return route.continue();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(cust),
      });
    });
  }
}

/**
 * Mock pending labor by branch. Use for /labor/approval.
 * ESM backend returns flat WOArrival rows; client transforms to WO+Labor[].
 * Pass either raw rows or transformed { WONo, Labor: [...] } - we flatten if needed.
 * @param {import("@playwright/test").Page} page
 * @param {Array} [requests] - Raw rows or WOs with Labor array. Defaults to [].
 */
async function mockPendingLaborByBranch(page, requests = []) {
  const raw =
    requests.length > 0 && requests[0].Labor
      ? requests.flatMap((wo) =>
          (wo.Labor || []).map((l) => {
            const date = l.DateOfLabor || new Date().toISOString().slice(0, 10);
            const hours = l.Hours ?? 1;
            const start = new Date(date + "T08:00:00");
            const end = new Date(start.getTime() + hours * 3600000);
            return {
              WONo: wo.WONo,
              ShipName: wo.ShipName,
              SerialNo: wo.SerialNo,
              UnitNo: wo.UnitNo,
              Make: wo.Make,
              Model: wo.Model,
              DispatchedDate: wo.DispatchedDate,
              Comments: wo.Comments,
              ArrivalDateTime: l.ArrivalDateTime || start.toISOString(),
              DepartureDateTime: l.DepartureDateTime || end.toISOString(),
              DispatchName: l.MechanicName || l.DispatchName,
              ID: l.ID,
              EmployeeId: l.EmployeeNumber,
              LastName: l.LastName,
              FirstName: l.FirstName,
            };
          })
        )
      : requests;
  await page.route("**/api/v1/labor/full/*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(raw),
    })
  );
}

/**
 * Mock timecards list. Use for /labor/timecards.
 * ESM returns flat WOArrival rows; client transforms.
 * @param {import("@playwright/test").Page} page
 * @param {Array} [timecards] - Raw rows { ID, ArrivalDateTime, DepartureDateTime, DispatchName, WONo, ImportFlag } or transformed. Defaults to [].
 */
async function mockTimecards(page, timecards = []) {
  const raw = (timecards || []).map((t) =>
    t.ArrivalDateTime
      ? t
      : {
          ID: t.ID,
          WONo: t.WONo,
          ArrivalDateTime: t.ClockIn || "2025-03-08T08:00:00",
          DepartureDateTime: t.ClockOut || "2025-03-08T16:30:00",
          DispatchName: t.EmployeeName || t.MechanicName,
          EmployeeId: t.EmployeeNumber,
          ImportFlag: t.ApprovedBy ? -1 : 0,
        }
  );
  await page.route("**/api/v1/labor/timecards/*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(raw),
    })
  );
}

/**
 * Mock labor import (approve) - ESM uses POST /api/v1/labor/import.
 * @param {import("@playwright/test").Page} page
 */
async function mockLaborApproveEndpoints(page) {
  await page.route("**/api/v1/labor/import", (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ success: true }]),
      });
    }
    return route.continue();
  });
}

module.exports = {
  defaultBranches,
  defaultDepts,
  defaultCustomer,
  defaultSalesCodes,
  defaultWorkOrder,
  defaultBillingOverview,
  mockBranchesAndDepts,
  mockWorkOrderViewed,
  mockOpenPurchaseOrders,
  mockAllBackOrders,
  mockRequestedPartsByBranch,
  mockPartsSearch,
  mockAssemblies,
  mockCreateAssembly,
  mockSalesCodes,
  mockCustomerForCreate,
  mockCreateWO,
  mockWorkOrderDetail,
  mockAuthEndpoints,
  mockPendingLaborByBranch,
  mockTimecards,
  mockLaborApproveEndpoints,
};
