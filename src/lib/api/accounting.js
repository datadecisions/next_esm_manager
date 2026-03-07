/**
 * Accounting API – pending invoices, distribute, print, summary charts.
 */

import { fetchWithAuth } from "../api";

/**
 * Get sales by month/year (for Summary Charts).
 * Returns [{ SaleBranch, SaleDept, SalesYear, SalesMonth, Net }].
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getSales(token) {
  const res = await fetchWithAuth("/api/v1/accounting/sales", {}, token);
  if (!res.ok) throw new Error("Failed to fetch sales");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get expenses by month/year (for Summary Charts).
 * Returns [{ SaleBranch, SaleDept, SalesYear, SalesMonth, Net }].
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getExpenses(token) {
  const res = await fetchWithAuth("/api/v1/accounting/expenses", {}, token);
  if (!res.ok) throw new Error("Failed to fetch expenses");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get net (sales - expenses) by month/year.
 * Returns [{ SaleBranch, SaleDept, SalesYear, SalesMonth, Net }].
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getNet(token) {
  const res = await fetchWithAuth("/api/v1/accounting/net", {}, token);
  if (!res.ok) throw new Error("Failed to fetch net");
  const text = await res.text();
  const data = text?.trim() ? JSON.parse(text) : [];
  return Array.isArray(data) ? data : [];
}

/**
 * Get overdue AR items (invoices 30+ days past due).
 * Returns [{ CustomerName, Balance, InvoiceDate, InvoiceNo }].
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getOverdue(token) {
  const res = await fetchWithAuth("/api/v1/accounting/overdue", {}, token);
  if (!res.ok) throw new Error("Failed to fetch overdue AR");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function toYMD(d) {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

/**
 * Get invoices available to print (by date range).
 * Used by Close / Distribute Orders.
 * @param {string|Date} startDate - YYYY-MM-DD or Date
 * @param {string|Date} endDate - YYYY-MM-DD or Date
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getPendingInvoicesSearch(startDate, endDate, token) {
  const s = toYMD(startDate);
  const e = toYMD(endDate);
  if (!s || !e) return [];
  const res = await fetchWithAuth(
    `/api/v1/accounting/pending_invoices_search/${s}/${e}`,
    {},
    token
  );
  if (!res.ok) throw new Error("Failed to fetch invoices");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get pending invoices by branch (and optionally dept).
 * @param {number|string} [branch]
 * @param {number|string} [dept]
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getPendingInvoices(branch, dept, token) {
  let path = "/api/v1/accounting/pending_invoices";
  if (branch) path += `/${branch}`;
  if (dept) path += `/${dept}`;
  const res = await fetchWithAuth(path, {}, token);
  if (!res.ok) throw new Error("Failed to fetch invoices");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get paperwork-complete work orders pending close (by branch).
 * Used by Process tab.
 * @param {number|string} branch
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getPendingClose(branch, token) {
  const res = await fetchWithAuth(
    `/api/v1/accounting/pending_close/${branch}`,
    {},
    token
  );
  if (!res.ok) throw new Error("Failed to fetch pending close");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get credit approval data: customers over credit limit or with pending credit requests.
 * Each item has BillTo, CustomerName, BalanceWithoutCredit, OutstandingBalance, CreditLimit, orders[].
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getCreditApprovals(token) {
  const res = await fetchWithAuth("/api/v1/accounting/credit/approvals", {}, token);
  if (!res.ok) throw new Error("Failed to fetch credit approvals");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get sales report for date range (MTD/YTD by account).
 * @param {{ startDate: string|Date; endDate: string|Date }} params
 * @returns {Promise<Array>}
 */
export async function getSalesReportMonthly(params) {
  const res = await fetchWithAuth("/api/v1/accounting/sales_report_monthly/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      startDate: typeof params.startDate === "string" ? params.startDate : params.startDate?.toISOString?.()?.slice(0, 10),
      endDate: typeof params.endDate === "string" ? params.endDate : params.endDate?.toISOString?.()?.slice(0, 10),
    }),
  });
  if (!res.ok) throw new Error("Failed to fetch sales report");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get open/closed work order summary by department.
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<Array<{ SaleDept: string; open_count: number; closed_count: number }>>}
 */
export async function getOpenClosedSummary(startDate, endDate) {
  const s = toYMD(startDate);
  const e = toYMD(endDate);
  if (!s || !e) return [];
  const res = await fetchWithAuth(
    `/api/v1/accounting/invoices/open_closed_summary/${s}/${e}`,
    {}
  );
  if (!res.ok) throw new Error("Failed to fetch open/closed summary");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get chart of accounts with MTD/YTD totals for date range.
 * Returns { accounts, currentFY, priorFY } - client merges into accounts with calculations.
 * @param {string|Date} startDate - YYYY-MM-DD or Date
 * @param {string|Date} endDate - YYYY-MM-DD or Date
 * @param {string} token
 * @returns {Promise<{ accounts: Array, currentFY: Array, priorFY: Array }>}
 */
export async function getAccountsWithTotals(startDate, endDate, token) {
  const s = toYMD(startDate);
  const e = toYMD(endDate);
  if (!s || !e) return { accounts: [], currentFY: [], priorFY: [] };
  const res = await fetchWithAuth(
    `/api/v1/accounting/accounts/${s}/${e}`,
    {},
    token
  );
  if (!res.ok) throw new Error("Failed to fetch chart of accounts");
  const data = await res.json();
  return {
    accounts: Array.isArray(data?.accounts) ? data.accounts : [],
    currentFY: Array.isArray(data?.currentFY) ? data.currentFY : [],
    priorFY: Array.isArray(data?.priorFY) ? data.priorFY : [],
  };
}

/**
 * Get accounting accounts (for PO line item account selection).
 * @param {string} [query] - Optional search query
 * @param {string} token
 * @returns {Promise<Array<{ AccountNo: string; Description: string }>>}
 */
export async function getAccounts(query, token) {
  const path = query
    ? `/api/v1/accounting/accounts/${encodeURIComponent(query)}`
    : "/api/v1/accounting/accounts";
  const res = await fetchWithAuth(path, {}, token);
  if (!res.ok) throw new Error("Failed to fetch accounts");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get budget for a branch/dept/month/year.
 * @param {number|string} branch
 * @param {number|string} dept
 * @param {number} year
 * @param {number} month - 1-12
 * @param {string} token
 * @returns {Promise<{ amount?: number }|null>}
 */
export async function getBudget(branch, dept, year, month, token) {
  const res = await fetchWithAuth(
    `/api/v1/accounting/budget/${branch}/${dept}/${year}/${month}`,
    {},
    token
  );
  if (!res.ok) throw new Error("Failed to fetch budget");
  const text = await res.text();
  const data = text?.trim() ? JSON.parse(text) : null;
  return data ?? null;
}

/**
 * Set budget for a branch/dept/month/year.
 * @param {{ amount: number|string; branch: number|string; dept: number|string; month: number|string; year: number|string }} data
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function setBudget(data, token) {
  const res = await fetchWithAuth("/api/v1/accounting/budget/set", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const errText = await res.text();
    const err = errText?.trim() ? JSON.parse(errText) : {};
    throw new Error(err?.message || "Failed to save budget");
  }
  const text = await res.text();
  const result = text?.trim() ? JSON.parse(text) : null;
  return result ?? data;
}

/**
 * Get balance sheet (Assets/Liabilities) for a date.
 * Returns [{ Description, Type, sectionTitle, Branch, debit, credit }].
 * @param {string|Date} date - YYYY-MM-DD or Date (month end for "as of" date)
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getBalanceSheet(date, token) {
  const d = toYMD(date);
  if (!d) return [];
  const res = await fetchWithAuth(
    `/api/v1/accounting/balance_sheet/${d}`,
    {},
    token
  );
  if (!res.ok) throw new Error("Failed to fetch balance sheet");
  const data = await res.json();
  const arr = Array.isArray(data) ? data : (data?.data ?? data?.summary ?? []);
  return Array.isArray(arr) ? arr : [];
}

/**
 * Get balance sheet with type breakdown (Assets, Liabilities, Sales, Costs, Expenses).
 * Returns [{ Description, Type, sectionTitle, Branch, debit, credit, category, subProp }].
 * @param {string|Date} date - YYYY-MM-DD or Date
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getBalanceSheetTypes(date, token) {
  const d = toYMD(date);
  if (!d) return [];
  const res = await fetchWithAuth(
    `/api/v1/accounting/balance_sheet_types/${d}`,
    {},
    token
  );
  if (!res.ok) throw new Error("Failed to fetch balance sheet");
  const data = await res.json();
  const arr = Array.isArray(data) ? data : (data?.data ?? data?.summary ?? []);
  return Array.isArray(arr) ? arr : [];
}

/**
 * Create a new chart of accounts entry.
 * @param {object} data - { AccountNo, Description, Type, GPAccountNo?, ReportType, Section, SectionGroup?, Item?, ItemDescription?, Controlled?, AccountsRecievable?, AccountsPayable?, CashAccount? }
 * @param {string} token
 * @returns {Promise<void>}
 */
export async function createAccount(data, token) {
  const res = await fetchWithAuth("/api/v1/accounting/chart/account/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to create account");
  }
}

/**
 * Get journal header history for date range.
 * Returns GL rows with Journal, Posted, EffectiveDate, Amount, etc. Client groups by Journal.
 * @param {string|Date} startDate - YYYY-MM-DD or Date
 * @param {string|Date} endDate - YYYY-MM-DD or Date
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getJournalHistory(startDate, endDate, token) {
  const s = toYMD(startDate);
  const e = toYMD(endDate);
  if (!s || !e) return [];
  const res = await fetchWithAuth(
    `/api/v1/accounting/journal/history/${s}/${e}`,
    {},
    token
  );
  if (!res.ok) throw new Error("Failed to fetch journal history");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Search journal names by partial match.
 * Returns { names, details } for autocomplete.
 * @param {string} search - Search term
 * @param {string} token
 * @returns {Promise<{ names: Array, details: Array }>}
 */
export async function getJournalNames(search, token) {
  if (!search || String(search).trim().length < 2) return { names: [], details: [] };
  const res = await fetchWithAuth(
    `/api/v1/accounting/journal/names/${encodeURIComponent(search)}`,
    {},
    token
  );
  if (!res.ok) throw new Error("Failed to fetch journal names");
  const data = await res.json();
  return {
    names: Array.isArray(data?.names) ? data.names : [],
    details: Array.isArray(data?.details) ? data.details : [],
  };
}

/**
 * Get journal detail lines for a journal.
 * @param {string} journalId - Journal identifier
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getJournalItems(journalId, token) {
  if (!journalId) return [];
  const res = await fetchWithAuth(
    `/api/v1/accounting/journal/items/${encodeURIComponent(journalId)}`,
    {},
    token
  );
  if (!res.ok) throw new Error("Failed to fetch journal items");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Create a new manual journal.
 * @param {object} payload - { Journal, EffectiveDate, orderLines, JournalType?, ControlNo?, Comments?, Source?, AccountType? }
 *   orderLines: [{ Account: { AccountNo }, AccountNo?, Debit?, Credit?, Amount?, Description?, ControlNo?, InvoiceNo?, APInvoiceNo?, CustomerNo?, VendorNo? }]
 *   Amount = Credit - Debit per line. Backend uses AccountNo from Account if present.
 * @param {string} token
 * @returns {Promise<{ header: object, details: Array }>}
 */
/**
 * Get AR detail (invoices, payments) for a customer by date range.
 * @param {string} customerNo - Customer number (BillTo)
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getCustomerInvoices(customerNo, startDate, endDate, token) {
  if (!customerNo || !startDate || !endDate) return [];
  const c = encodeURIComponent(customerNo);
  const s = encodeURIComponent(startDate);
  const e = encodeURIComponent(endDate);
  const res = await fetchWithAuth(
    `/api/v1/accounting/customer/invoices/${c}/${s}/${e}`,
    {},
    token
  );
  if (!res.ok) throw new Error("Failed to fetch customer invoices");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get AR aging report for a date (all customers; filter by customerNo client-side).
 * Returns [{ CustomerNo, Name, Balance, Current, age_30_days, age_60_days, age_90_days, age_120_days }].
 * @param {{ month: number; day: number; year: number }} date - 1-based month
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getBillingARAging(date, token) {
  const { month, day, year } = date;
  const res = await fetchWithAuth(
    `/api/v1/accounting/billing_ar_aging/${month}/${day}/${year}`,
    {},
    token
  );
  if (!res.ok) throw new Error("Failed to fetch AR aging");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Search AR records (AR detail inquiry).
 * Filters: customerNo, invoiceNo, poNo, startDate, endDate, showHistory.
 * At least one filter recommended. showHistory="true" includes closed/historical records.
 * @param {{ customerNo?: string; invoiceNo?: string; poNo?: string; startDate?: string; endDate?: string; showHistory?: boolean }} params
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getARDetailInquiry(params, token) {
  const q = new URLSearchParams();
  if (params.customerNo) q.set("customerNo", params.customerNo);
  if (params.invoiceNo) q.set("invoiceNo", params.invoiceNo);
  if (params.poNo) q.set("poNo", params.poNo);
  if (params.startDate) q.set("startDate", params.startDate);
  if (params.endDate) q.set("endDate", params.endDate);
  if (params.showHistory) q.set("showHistory", "true");
  const res = await fetchWithAuth(
    `/api/v1/accounting/ar/inquiry?${q.toString()}`,
    {},
    token
  );
  if (!res.ok) throw new Error("Failed to search AR records");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get open invoices (with balance) for a customer.
 * @param {string} customerNo - Customer number
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getOpenInvoicesByCustomer(customerNo, token) {
  if (!customerNo) return [];
  const c = encodeURIComponent(customerNo);
  const res = await fetchWithAuth(
    `/api/v1/accounting/customer/invoices/open/${c}`,
    {},
    token
  );
  if (!res.ok) throw new Error("Failed to fetch open invoices");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get GL ledger entries for a customer by date range.
 * @param {string} customerNo - Customer number
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getCustomerLedger(customerNo, startDate, endDate, token) {
  if (!customerNo || !startDate || !endDate) return [];
  const c = encodeURIComponent(customerNo);
  const s = encodeURIComponent(startDate);
  const e = encodeURIComponent(endDate);
  const res = await fetchWithAuth(
    `/api/v1/accounting/customer/ledger/${c}/${s}/${e}`,
    {},
    token
  );
  if (!res.ok) throw new Error("Failed to fetch customer ledger");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get GL ledger entries for equipment by ControlNo.
 * @param {string} controlNo - Equipment ControlNo (from Equipment.ControlNo)
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getEquipmentLedger(controlNo, startDate, endDate, token) {
  if (!controlNo || !startDate || !endDate) return [];
  const c = encodeURIComponent(controlNo);
  const s = encodeURIComponent(startDate);
  const e = encodeURIComponent(endDate);
  const res = await fetchWithAuth(
    `/api/v1/accounting/equipment/ledger/${c}/${s}/${e}`,
    {},
    token
  );
  if (!res.ok) throw new Error("Failed to fetch equipment ledger");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Post a journal to GL (create GLDetail entries).
 * @param {string} journalId - Journal name
 * @param {string} token
 * @returns {Promise<{ ok: boolean, journal: string }>}
 */
/**
 * Bank Reconciliation APIs
 */

function unpackRecon(res) {
  const p = res?.data ?? res?.result ?? res;
  if (p?.items) return { items: p.items, total: typeof p.total === "number" ? p.total : p.items.length };
  if (Array.isArray(p)) return { items: p, total: p.length };
  return { items: [], total: 0 };
}

/**
 * Get accounting (GL) rows for reconciliation.
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @param {{ account?: string; status?: string; page?: number; pageSize?: number; cumulative?: boolean }} [params]
 * @param {string} token
 * @returns {Promise<{ items: Array, total: number }>}
 */
export async function getReconciliationAccounting(startDate, endDate, params, token) {
  const s = toYMD(startDate);
  const e = toYMD(endDate);
  if (!s || !e) return { items: [], total: 0 };
  const q = new URLSearchParams();
  if (params?.account) q.set("account", params.account);
  if (params?.status) q.set("status", params.status);
  if (params?.page) q.set("page", String(params.page));
  if (params?.pageSize) q.set("pageSize", String(params.pageSize));
  if (params?.cumulative) q.set("cumulative", "true");
  const query = q.toString();
  const res = await fetchWithAuth(
    `/api/v1/accounting/reconciliation/accounting/${s}/${e}${query ? `?${query}` : ""}`,
    {},
    token
  );
  if (!res.ok) throw new Error("Failed to fetch accounting rows");
  const data = await res.json();
  return unpackRecon(data);
}

/**
 * Get bank rows for reconciliation.
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @param {{ account?: string; status?: string; page?: number; pageSize?: number; cumulative?: boolean }} [params]
 * @param {string} token
 * @returns {Promise<{ items: Array, total: number }>}
 */
export async function getReconciliationBank(startDate, endDate, params, token) {
  const s = toYMD(startDate);
  const e = toYMD(endDate);
  if (!s || !e) return { items: [], total: 0 };
  const q = new URLSearchParams();
  if (params?.account) q.set("account", params.account);
  if (params?.status) q.set("status", params.status);
  if (params?.page) q.set("page", String(params.page));
  if (params?.pageSize) q.set("pageSize", String(params.pageSize));
  if (params?.cumulative) q.set("cumulative", "true");
  const query = q.toString();
  const res = await fetchWithAuth(
    `/api/v1/accounting/reconciliation/bank/${s}/${e}${query ? `?${query}` : ""}`,
    {},
    token
  );
  if (!res.ok) throw new Error("Failed to fetch bank rows");
  const data = await res.json();
  return unpackRecon(data);
}

/**
 * Get GL and bank account lists for reconciliation filters.
 * @param {string} token
 * @returns {Promise<{ glAccounts: Array, bankAccounts?: Array }>}
 */
export async function getReconciliationAccounts(token) {
  const res = await fetchWithAuth("/api/v1/accounting/reconciliation/accounts", {}, token);
  if (!res.ok) throw new Error("Failed to fetch accounts");
  const data = await res.json();
  const unpacked = unpackRecon(data);
  return {
    glAccounts: unpacked.items || [],
    bankAccounts: data?.bankAccounts || [],
  };
}

/**
 * Get reconciliation summary (accounting balance, bank balance, difference).
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @param {{ account?: string }} [params]
 * @param {string} token
 * @returns {Promise<{ accountingBalance?: number; bankBalance?: number; difference?: number }>}
 */
export async function getReconciliationSummary(startDate, endDate, params, token) {
  const s = toYMD(startDate);
  const e = toYMD(endDate);
  if (!s || !e) return {};
  const q = params?.account ? `?account=${encodeURIComponent(params.account)}` : "";
  const res = await fetchWithAuth(
    `/api/v1/accounting/reconciliation/summary/${s}/${e}${q}`,
    {},
    token
  );
  if (!res.ok) throw new Error("Failed to fetch summary");
  return res.json();
}

/**
 * Create matches between accounting and bank rows.
 * @param {{ accountingIds: number[]; bankIds: number[]; matchDate?: string; note?: string }} payload
 * @param {string} token
 * @returns {Promise<Array<{ matchId?: number }>>}
 */
export async function postReconciliationMatches(payload, token) {
  const body = {
    ...payload,
    accounting_ids: payload.accountingIds,
    bank_ids: payload.bankIds,
  };
  const res = await fetchWithAuth("/api/v1/accounting/reconciliation/matches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to create matches");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [data];
}

/**
 * Delete a reconciliation match.
 * @param {number|string} matchId
 * @param {string} token
 */
export async function deleteReconciliationMatch(matchId, token) {
  const res = await fetchWithAuth(
    `/api/v1/accounting/reconciliation/matches/${encodeURIComponent(matchId)}`,
    { method: "DELETE" },
    token
  );
  if (!res.ok) throw new Error("Failed to delete match");
}

/**
 * Add adjustment (create journal from bank transaction).
 * @param {object} payload
 * @param {string} token
 */
export async function postReconciliationAdjustment(payload, token) {
  const res = await fetchWithAuth("/api/v1/accounting/reconciliation/adjustments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to add adjustment");
  }
}

export async function postJournal(journalId, token) {
  const res = await fetchWithAuth("/api/v1/accounting/journal/post", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ journal: journalId }),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || err?.err || "Failed to post journal");
  }
  return res.json();
}

export async function createJournal(payload, token) {
  const res = await fetchWithAuth("/api/v1/accounting/journal/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to create journal");
  }
  return res.json();
}

/**
 * Send selected invoices to print (or email if EMailInvoice = -1).
 * @param {{ toPrint: number[] }} data - Array of InvoiceNo (WONo)
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function printInvoices(data, token) {
  const res = await fetchWithAuth("/api/v1/accounting/print_invoices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to print invoices");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Get WIP (aging) summary report.
 * Returns [{ Name, CustomerSale, Title, Overdue_0_14, Overdue_15_30, Overdue_31_Plus, GrandTotal }].
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getAgingSummary(token) {
  const res = await fetchWithAuth("/api/v1/accounting/aging_summary", {}, token);
  if (!res.ok) throw new Error("Failed to fetch aging summary");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get daily sales overview for a date.
 * @param {number|string} month - 1-12
 * @param {number|string} day - 1-31
 * @param {number|string} year
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getDailySalesOverview(month, day, year, token) {
  const res = await fetchWithAuth(
    `/api/v1/accounting/sales/daily/${month}/${day}/${year}`,
    {},
    token
  );
  if (!res.ok) throw new Error("Failed to fetch daily sales");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get daily sales detail for a date.
 * @param {number|string} month - 1-12
 * @param {number|string} day - 1-31
 * @param {number|string} year
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getDailySalesDetail(month, day, year, token) {
  const res = await fetchWithAuth(
    `/api/v1/accounting/sales/daily_detail/${month}/${day}/${year}`,
    {},
    token
  );
  if (!res.ok) throw new Error("Failed to fetch daily sales detail");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get full daily sales report with goals, billing days, MTD goal/difference.
 * Returns { month, year, day, billingData: { currentBillingDay, totalBillingDays }, salesData: [...], totals: {...} }.
 * @param {number|string} month - 1-12
 * @param {number|string} day - 1-31
 * @param {number|string} year
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function getDailySalesReport(month, day, year, token) {
  const res = await fetchWithAuth(
    `/api/v1/accounting/sales/daily_report/${month}/${day}/${year}`,
    {},
    token
  );
  if (!res.ok) throw new Error("Failed to fetch daily sales report");
  return res.json();
}
