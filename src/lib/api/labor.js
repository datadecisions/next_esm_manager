/**
 * Labor API – posted (arrivals) and imported labor for work orders.
 */

import { fetchWithAuth, fetchWithAuthRaw } from "../api";

function toYMD(d) {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

/**
 * Get work orders closed by month (past 6 months).
 * @param {string|Date} startDate - YYYY-MM-DD or Date
 * @param {string|Date} endDate - YYYY-MM-DD or Date
 * @returns {Promise<Array<{ Year: number; Month: number; TotalClosed: number; DistinctBillTo: number }>>}
 */
export async function getLaborClosedReport(startDate, endDate) {
  const s = toYMD(startDate);
  const e = toYMD(endDate);
  if (!s || !e) return [];
  const res = await fetchWithAuth(`/api/v1/labor/reports/closed/${s}/${e}`, {});
  if (!res.ok) throw new Error("Failed to fetch closed report");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get labor hours billed by month and sale code.
 * @param {string|Date} startDate - YYYY-MM-DD or Date
 * @param {string|Date} endDate - YYYY-MM-DD or Date
 * @returns {Promise<Array<{ Year: number; Month: number; Billed: number; Code: string }>>}
 */
export async function getLaborTotalReport(startDate, endDate) {
  const s = toYMD(startDate);
  const e = toYMD(endDate);
  if (!s || !e) return [];
  const res = await fetchWithAuth(`/api/v1/labor/reports/total/${s}/${e}`, {});
  if (!res.ok) throw new Error("Failed to fetch labor report");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// ─── Labor KPI Dashboard ────────────────────────────────────────────────────

/**
 * Get labor billing overview (hours, cost, sell by sale code and month).
 * @param {{ startDate: string; endDate: string; mechanic?: string }} params
 * @returns {Promise<Array<{ SaleCode, Year, Month, Cost, Sell, Hours, Rate }>>}
 */
export async function getLaborOverview(params) {
  const s = toYMD(params.startDate);
  const e = toYMD(params.endDate);
  if (!s || !e) return [];
  const m = params.mechanic ? `/${encodeURIComponent(params.mechanic)}` : "";
  const res = await fetchWithAuth(`/api/v1/labor/overview/${s}/${e}${m}`);
  if (!res.ok) throw new Error("Failed to fetch labor overview");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get labor scorecard (per-tech payroll vs billed, sale code breakdown).
 * Requires EmployeeWorkDetails. Returns raw WOLabor rows with payroll totals.
 * @param {{ startDate: string; endDate: string; mechanic?: string }} params
 * @returns {Promise<Array>}
 */
export async function getLaborScorecard(params) {
  const s = toYMD(params.startDate);
  const e = toYMD(params.endDate);
  if (!s || !e) return [];
  const m = params.mechanic ? `/${encodeURIComponent(params.mechanic)}` : "";
  const res = await fetchWithAuth(`/api/v1/labor/scorecard/${s}/${e}${m}`);
  if (!res.ok) throw new Error("Failed to fetch labor scorecard");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get open labor summary (open orders per tech, aging buckets, labor value).
 * @param {{ branches: string }} params - comma-separated branch numbers e.g. "101,102"
 * @returns {Promise<{ totals: object; data: Array }>}
 */
export async function getOpenLaborSummary(params) {
  const branches = params.branches || "";
  const res = await fetchWithAuth(
    `/api/v1/labor/open_summary_report/${encodeURIComponent(branches)}`
  );
  if (!res.ok) throw new Error("Failed to fetch open labor summary");
  const data = await res.json();
  return data || { totals: {}, data: [] };
}

/**
 * Get timecards report (per-tech hours: total, regular, non-billable, overtime).
 * @param {{ branches: string; startDate: string; endDate: string }} params
 * @returns {Promise<{ rows: Array; branches: string }>}
 */
export async function getLaborTimecardsReport(params) {
  const branches = params.branches || "";
  const s = toYMD(params.startDate);
  const e = toYMD(params.endDate);
  if (!branches || !s || !e) return { rows: [], branches: "" };
  const res = await fetchWithAuth(
    `/api/v1/labor/timecards_report/${encodeURIComponent(branches)}/${s}/${e}`
  );
  if (!res.ok) throw new Error("Failed to fetch timecards report");
  const data = await res.json();
  return data || { rows: [], branches: "" };
}

/**
 * Get posted labor (arrivals) for a work order – technician time entries not yet imported.
 * @param {number|string} woNo
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getLaborArrivals(woNo, token) {
  const res = await fetchWithAuth(`/api/v1/labor/arrivals/${woNo}`, {}, token);
  if (!res.ok) {
    throw new Error("Failed to fetch labor arrivals");
  }
  return res.json();
}

/**
 * Get imported labor for a work order – time entries already imported to the WO.
 * @param {number|string} woNo
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getLaborImports(woNo, token) {
  const res = await fetchWithAuth(`/api/v1/labor/imports/${woNo}`, {}, token);
  if (!res.ok) {
    throw new Error("Failed to fetch labor imports");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Import all posted labor entries for a work order.
 * @param {{ WONo: number|string; DispatchName?: string }} data
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function importLabor(data, token) {
  const res = await fetchWithAuth("/api/v1/labor/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to import labor");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Create a new labor entry for a work order.
 * @param {object} data - { WONo, SaleBranch, SaleDept, SaleCode?, DateOfLabor, MechanicName, EmployeeNumber, Hours, LaborRateType, Section? }
 * @param {string} token
 * @returns {Promise<object>} Created labor entry
 */
export async function createLabor(data, token) {
  const res = await fetchWithAuth("/api/v1/labor/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to create labor entry");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Update a posted labor (arrival) entry – times and section.
 * @param {object} data - { ID, WONo, ArrivalDateTime, DepartureDateTime, Section? }
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function updatePostedArrival(data, token) {
  const res = await fetchWithAuth("/api/v1/work_order/arrivals/", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to update labor entry");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Update an imported labor entry.
 * @param {object} data - Full entry with ID, WONo, DateOfLabor, MechanicNo, MechanicName, Hours, LaborRateType, Section?, SaleCode?
 * @param {string} token
 * @returns {Promise<object>} Updated entry
 */
export async function updateLaborImport(data, token) {
  const res = await fetchWithAuth("/api/v1/labor/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to update labor entry");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Delete an imported labor entry.
 * @param {number|string} id - Labor import ID
 * @param {string} token
 * @returns {Promise<void>}
 */
export async function deleteLaborImport(id, token) {
  const res = await fetchWithAuth(`/api/v1/labor/import/${id}`, {
    method: "DELETE",
  }, token);
  if (!res.ok) {
    throw new Error("Failed to delete labor entry");
  }
}

/**
 * Get work orders with pending labor entries for approval by branch.
 * Calls ESM backend: GET /api/v1/labor/full/:branch/:startTime/:endTime/:showImportedLabor
 * Transforms flat WOArrival rows into WO + Labor[] shape.
 * @param {number|string} branch
 * @param {string} token
 * @param {{ startDate?: string; endDate?: string; showImportedLabor?: boolean }} [params]
 * @returns {Promise<Array<{ WONo, ShipName, ShipTo, Comments, SerialNo, Labor: Array }>>}
 */
export async function getPendingLaborByBranch(branch, token, params) {
  const start = params?.startDate || toYMD(new Date());
  const end = params?.endDate || toYMD(new Date());
  // When showImportedLabor is false, omit it so server returns all open labor (no date filter).
  // Passing "false" string is truthy in JS, causing wrong server-side date filtering.
  const showImported = params?.showImportedLabor;
  const url =
    showImported === true
      ? `/api/v1/labor/full/${encodeURIComponent(branch)}/${start}/${end}/true`
      : `/api/v1/labor/full/${encodeURIComponent(branch)}/${start}/${end}`;
  const res = await fetchWithAuth(url, {}, token);
  if (!res.ok) throw new Error("Failed to fetch pending labor");
  const raw = await res.json();
  const rows = Array.isArray(raw) ? raw : [];
  // Group flat WOArrival rows by WONo into { WONo, ..., Labor: [...] }
  const byWo = {};
  for (const row of rows) {
    const woNo = row.WONo;
    if (!woNo) continue;
    const laborEntry = {
      ID: row.ID,
      MechanicName: row.DispatchName,
      EmployeeName: [row.LastName, row.FirstName].filter(Boolean).join(", ") || row.DispatchName,
      EmployeeNumber: row.EmployeeId,
      ArrivalDateTime: row.ArrivalDateTime,
      DepartureDateTime: row.DepartureDateTime,
      duration: row.DepartureDateTime && row.ArrivalDateTime
        ? (new Date(row.DepartureDateTime).getTime() - new Date(row.ArrivalDateTime).getTime()) / 3600000
        : 0,
      DateOfLabor: row.ArrivalDateTime ? new Date(row.ArrivalDateTime).toISOString().slice(0, 10) : "",
      Hours: row.DepartureDateTime && row.ArrivalDateTime
        ? (new Date(row.DepartureDateTime).getTime() - new Date(row.ArrivalDateTime).getTime()) / 3600000
        : 0,
      Section: row.Section,
      SaleCode: row.SaleCode,
      SaleDept: row.SaleDept,
      ImportFlag: row.ImportFlag,
    };
    if (!byWo[woNo]) {
      byWo[woNo] = {
        WONo: row.WONo,
        ShipName: row.ShipName,
        ShipTo: row.ShipTo,
        Comments: row.Comments,
        SerialNo: row.SerialNo,
        UnitNo: row.UnitNo,
        Make: row.Make,
        Model: row.Model,
        DispatchedDate: row.DispatchedDate,
        Disposition: row.Disposition,
        Labor: [],
      };
    }
    byWo[woNo].Labor.push(laborEntry);
  }
  return Object.values(byWo);
}

/**
 * Get labor grouped by technician, including both unimported (pending) and imported.
 * Fetches twice: (1) without showImportedLabor for unimported (no server date filter),
 * (2) with showImportedLabor for imported in date range. Merges and filters client-side.
 * @param {number|string} branch
 * @param {string} token
 * @param {{ startDate?: string; endDate?: string; depts?: Array }} [params]
 * @returns {Promise<{ techs: Array<{ techId, name, lastName, firstName, unimported, imported, unimportedHours, importedHours, totalHours, overtime, weekend }> }>}
 */
export async function getLaborByTechByBranch(branch, token, params) {
  const start = params?.startDate || toYMD(new Date());
  const end = params?.endDate || toYMD(new Date());
  const EIGHT_HOURS = 8;
  const startMs = new Date(start + "T00:00:00").getTime();
  const endMs = new Date(end + "T23:59:59.999").getTime();
  const deptSet =
    params?.depts?.length
      ? new Set(params.depts.map((d) => d.Dept ?? d))
      : null;

  // 1. Fetch unimported (no 4th param = no server date filter, matches working flow)
  const urlUnimported = `/api/v1/labor/full/${encodeURIComponent(branch)}/${start}/${end}`;
  const res1 = await fetchWithAuth(urlUnimported, {}, token);
  if (!res1.ok) throw new Error("Failed to fetch labor");
  const raw1 = await res1.json();
  const rowsUnimported = Array.isArray(raw1) ? raw1 : [];

  // 2. Fetch imported (with date filter)
  const urlImported = `/api/v1/labor/full/${encodeURIComponent(branch)}/${start}/${end}/true`;
  const res2 = await fetchWithAuth(urlImported, {}, token);
  const raw2 = res2.ok ? await res2.json() : [];
  const rowsImported = Array.isArray(raw2) ? raw2.filter((r) => r.ImportFlag != null && r.ImportFlag !== 0) : [];

  const allRows = [...rowsUnimported, ...rowsImported];
  const byTech = {};
  for (const row of allRows) {
    if (deptSet && row.SaleDept != null && !deptSet.has(row.SaleDept)) continue;
    const techId = row.EmployeeId ?? row.DispatchName;
    if (!techId) continue;
    const dt = row.ArrivalDateTime ?? row.DepartureDateTime;
    if (dt) {
      const t = new Date(dt).getTime();
      if (t < startMs || t > endMs) continue;
    }
    const isUnimported = row.ImportFlag == null || row.ImportFlag === 0;
    const duration =
      row.DepartureDateTime && row.ArrivalDateTime
        ? (new Date(row.DepartureDateTime).getTime() - new Date(row.ArrivalDateTime).getTime()) / 3600000
        : 0;
    const entry = {
      ID: row.ID,
      WONo: row.WONo,
      MechanicName: row.DispatchName,
      EmployeeName: [row.LastName, row.FirstName].filter(Boolean).join(", ") || row.DispatchName,
      ArrivalDateTime: row.ArrivalDateTime,
      DepartureDateTime: row.DepartureDateTime,
      duration,
      Hours: duration,
      Section: row.Section,
      SaleCode: row.SaleCode,
      SaleDept: row.SaleDept,
      SaleBranch: row.SaleBranch,
      ImportFlag: row.ImportFlag,
      Disposition: row.Disposition,
      ShipName: row.ShipName,
      SerialNo: row.SerialNo,
      UnitNo: row.UnitNo,
      Make: row.Make,
      Model: row.Model,
      DispatchedDate: row.DispatchedDate,
    };
    if (!byTech[techId]) {
      byTech[techId] = {
        techId,
        name: row.DispatchName,
        lastName: row.LastName,
        firstName: row.FirstName,
        nickName: row.NickName,
        unimported: [],
        imported: [],
        unimportedHours: 0,
        importedHours: 0,
      };
    }
    if (isUnimported) {
      if (row.Disposition < 2) {
        byTech[techId].unimported.push(entry);
        byTech[techId].unimportedHours += duration;
      }
    } else {
      byTech[techId].imported.push(entry);
      byTech[techId].importedHours += duration;
    }
  }
  const techs = Object.values(byTech).map((t) => {
    const total = t.unimportedHours + t.importedHours;
    const allEntries = t.unimported.concat(t.imported);
    const weekend = allEntries.some((e) => {
      const d = e.DepartureDateTime ?? e.ArrivalDateTime;
      if (!d) return false;
      const day = new Date(d).getDay();
      return day === 0 || day === 6;
    });
    return {
      ...t,
      totalHours: total,
      overtime: t.unimportedHours > EIGHT_HOURS || t.importedHours > EIGHT_HOURS || total > EIGHT_HOURS,
      weekend,
    };
  });
  return { techs };
}

/**
 * Approve (import) labor entries for a work order.
 * Calls ESM backend: POST /api/v1/labor/import with { WONo, DispatchName }.
 * Imports all WOArrival entries for that WO + tech. Call once per (WONo, DispatchName) pair.
 * @param {{ WONo: number|string; DispatchName?: string; MechanicName?: string }} data
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function approveLaborEntry(data, token) {
  const dispatchName = data.DispatchName ?? data.MechanicName;
  if (!data.WONo || !dispatchName) {
    throw new Error("WONo and DispatchName required");
  }
  const res = await fetchWithAuth("/api/v1/labor/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ WONo: data.WONo, DispatchName: dispatchName }),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || err?.error || "Failed to approve labor");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Deny - no backend action. Entries stay unimported. UI removes from selection.
 * @param {number|string} id - Labor entry ID (unused; backend has no deny)
 * @param {number|string} woNo
 * @param {string} token
 * @returns {Promise<void>}
 */
export async function denyLaborEntry(id, woNo, token) {
  // No backend endpoint for deny; entries remain in WOArrival unimported
  await Promise.resolve();
}

// ─── Timecards (port from old app) ──────────────────────────────────────────

/**
 * Get timecards for a branch and date range.
 * Calls ESM backend: GET /api/v1/labor/timecards/:branch/:date/:endDate
 * Transforms WOArrival rows to timecard shape.
 * @param {{ startDate?: string; endDate?: string; branch?: number|string }} params
 * @param {string} token
 * @returns {Promise<Array<{ ID, EmployeeNumber, EmployeeName, WONo, DateOfLabor, ClockIn, ClockOut, Hours, Status }>>}
 */
export async function getTimecards(params, token) {
  const branch = params?.branch;
  const start = params?.startDate || toYMD(new Date());
  const end = params?.endDate || toYMD(new Date());
  if (!branch) return [];
  const url = `/api/v1/labor/timecards/${encodeURIComponent(branch)}/${start}/${end}`;
  const res = await fetchWithAuth(url, {}, token);
  if (!res.ok) throw new Error("Failed to fetch timecards");
  const raw = await res.json();
  const rows = Array.isArray(raw) ? raw : [];
  return rows.map((r) => {
    const arrival = r.ArrivalDateTime ? new Date(r.ArrivalDateTime) : null;
    const departure = r.DepartureDateTime ? new Date(r.DepartureDateTime) : null;
    const hours = arrival && departure ? (departure.getTime() - arrival.getTime()) / 3600000 : 0;
    return {
      ID: r.ID,
      EmployeeNumber: r.EmployeeId,
      EmployeeName: r.DispatchName,
      MechanicName: r.DispatchName,
      WONo: r.WONo,
      DateOfLabor: arrival ? arrival.toISOString().slice(0, 10) : "",
      ClockIn: r.ArrivalDateTime,
      ClockOut: r.DepartureDateTime,
      ArrivalDateTime: r.ArrivalDateTime,
      DepartureDateTime: r.DepartureDateTime,
      Hours: hours,
      duration: hours,
      Status: r.ImportFlag === -1 ? "Approved" : "Pending",
      ApprovedBy: r.ImportFlag === -1 ? "Imported" : null,
    };
  });
}

/**
 * Timecards approval - ESM uses labor import. For timecard view, approval = import per WO+tech.
 * This is a placeholder; the timecards page may use a different flow (bulk import by tech).
 * @param {{ ids: number[]|string[] }} data
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function approveTimecards(data, token) {
  // ESM timecards don't have a separate approve endpoint; use labor/import per WO+DispatchName
  // For now return success - caller would need to map ids to (WONo, DispatchName) and call import
  return Promise.resolve({ success: true });
}

// ─── Timecard Document Center (MechanicImages PDFs) ─────────────────────────

/**
 * Get employees who have timecard PDFs in MechanicImages.
 * @returns {Promise<Array<{ Number, FirstName, LastName, DispatchName }>>}
 */
export async function getEmployeesWithTimecards() {
  const res = await fetchWithAuth("/api/v1/labor/hr_export_employees");
  if (!res.ok) throw new Error("Failed to fetch employees with timecards");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get timecard metadata (ID, FileName, DateAdded) for a mechanic and date range.
 * @param {string} dispatchName - Technician dispatch name
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<Array<{ ID, FileName, DateAdded }>>}
 */
export async function getTimecardMetadata(dispatchName, startDate, endDate) {
  const m = encodeURIComponent(dispatchName);
  const url = `/api/v1/labor/paperwork/${m}/${startDate}/${endDate}`;
  const res = await fetchWithAuth(url);
  if (!res.ok) throw new Error("Failed to fetch timecard metadata");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Fetch a single timecard image/PDF as blob for viewing.
 * Uses /api/proxy/image to avoid binary corruption (the /api/v1 proxy uses res.text() which corrupts PDFs).
 * @param {number|string} imageId - MechanicImages ID
 * @returns {Promise<Blob>}
 */
export async function getTimecardImageBlob(imageId) {
  const res = await fetchWithAuthRaw(
    `/api/proxy/image?source=documents&table=mechanic&id=${imageId}`
  );
  if (!res.ok) throw new Error("Failed to load timecard");
  return res.blob();
}

/**
 * Get URL for timecard image (for download). Uses blob + object URL pattern.
 * Caller should revoke the URL when done: URL.revokeObjectURL(url)
 * @param {number|string} imageId
 * @returns {Promise<string>} Object URL for the blob
 */
export async function getTimecardImageUrl(imageId) {
  const blob = await getTimecardImageBlob(imageId);
  return URL.createObjectURL(blob);
}

/**
 * Get download URL for timecard ZIP export (all PDFs for a mechanic in date range).
 * Returns blob URL - caller should revoke when done.
 * @param {string} dispatchName
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<string>} Object URL for the ZIP blob
 */
export async function getTimecardZipUrl(dispatchName, startDate, endDate) {
  const m = encodeURIComponent(dispatchName);
  const url = `/api/v1/labor/export_timecards/${m}/${startDate}/${endDate}`;
  const res = await fetchWithAuthRaw(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Export failed");
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
