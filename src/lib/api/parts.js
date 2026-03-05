/**
 * Parts API – work order parts (current, update).
 */

import { fetchWithAuth } from "../api";

/**
 * Get current parts for a work order (WebPartsOrder + WOParts – pending + approved).
 * @param {number|string} woNo
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getParts(woNo, token) {
  const res = await fetchWithAuth(`/api/v1/parts/current/${woNo}`, {}, token);
  if (!res.ok) throw new Error("Failed to fetch parts");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get work orders with requested parts for a branch (for approval flow).
 * @param {number|string} branch
 * @param {string} token
 * @returns {Promise<Array<{ WONo, ShipName, ShipTo, Comments, SerialNo, UnitNo, Make, Model, DispatchedDate, Parts }>>}
 */
export async function getRequestedPartsByBranch(branch, token) {
  const res = await fetchWithAuth(
    `/api/v1/parts/requested_branch/${encodeURIComponent(branch)}`,
    {},
    token
  );
  if (!res.ok) throw new Error("Failed to fetch requested parts");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get approved parts only (WOParts – excludes pending WebPartsOrder).
 * Matches legacy approve form which uses view.wo.Parts from getApprovedParts.
 * @param {number|string} woNo
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getApprovedParts(woNo, token) {
  const res = await fetchWithAuth(`/api/v1/parts/approved/${woNo}`, {}, token);
  if (!res.ok) throw new Error("Failed to fetch approved parts");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Update a work order part (Sell, Cost, Section, etc.).
 * @param {{ ID: number|string; WONo: number|string; Sell?: number|string; Cost?: number|string; Section?: string; [key: string]: unknown }} data
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function updatePart(data, token) {
  const res = await fetchWithAuth("/api/v1/parts/update_line", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to update part");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Refresh part price from cost/markup.
 * @param {{ ID: number|string; WONo: number|string; [key: string]: unknown }} part
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function refreshPartPrice(part, token) {
  const res = await fetchWithAuth("/api/v1/parts/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(part),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to refresh price");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Delete an approved part (WOParts) from a work order.
 * @param {number|string} partId
 * @param {number|string} woNo
 * @param {string} token
 * @returns {Promise<void>}
 */
export async function deletePart(partId, woNo, token) {
  const res = await fetchWithAuth(`/api/v1/parts/approved_part/${partId}/${woNo}`, {
    method: "DELETE",
  }, token);
  if (!res.ok) throw new Error("Failed to delete part");
}

/**
 * Delete a requested/pending part (WebPartsOrder) from a work order.
 * Use when part.type === "WebPartsOrder".
 * @param {number|string} partId - UniqueField from WebPartsOrder
 * @param {number|string} woNo
 * @param {string} token
 * @returns {Promise<void>}
 */
export async function deleteRequestedPart(partId, woNo, token) {
  const res = await fetchWithAuth(`/api/v1/parts/requested/${partId}/${woNo}`, {
    method: "DELETE",
  }, token);
  if (!res.ok) throw new Error("Failed to remove requested part");
}

/**
 * Approve a pending part (WebPartsOrder) – adds it to WOParts.
 * @param {{ PartNo?: string; RequestedPartNo?: string; Warehouse?: string; Qty?: number; Section?: string; RepairCode?: string; Sell?: number; [key: string]: unknown }} part
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function approvePart(part, token) {
  const body = {
    PartNo: part.PartNo || part.RequestedPartNo,
    Warehouse: part.Warehouse,
    WONo: part.WONo,
    Qty: part.Qty,
    Section: part.Section || part.RepairCode,
    RepairCode: part.RepairCode || part.Section,
    Sell: part.Sell ?? 0,
  };
  const res = await fetchWithAuth("/api/v1/parts/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to approve part");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Download approved parts as CSV.
 * @param {number|string} woNo
 * @param {string} token
 * @returns {Promise<string>} CSV content
 */
export async function downloadPartsCsv(woNo, token) {
  const res = await fetchWithAuth(`/api/v1/work_order/approved_parts/csv/${woNo}`, {}, token);
  if (!res.ok) throw new Error("Failed to download parts");
  return res.text();
}

/**
 * Search parts by query (optionally filtered by warehouse).
 * @param {string} query
 * @param {string} [warehouse]
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function searchParts(query, warehouse, token) {
  // Use "%" for empty query (match all); legacy warehouse uses parts/search/%/Main
  const q = encodeURIComponent(query || "%");
  const w = warehouse ? `/${encodeURIComponent(warehouse)}` : "";
  const res = await fetchWithAuth(`/api/v1/parts/search/${q}${w}`, {}, token);
  if (!res.ok) throw new Error("Failed to search parts");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Search all parts (for PO add part flow).
 * @param {string} query
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function searchAllParts(query, token) {
  const q = encodeURIComponent(query || "");
  const res = await fetchWithAuth(`/api/v1/parts/search_all/${q}`, {}, token);
  if (!res.ok) throw new Error("Failed to search parts");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get parts that need to be ordered (Restock flow).
 * @param {number|string} branch
 * @param {string} [recent]
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getPartsToOrder(branch, recent, token) {
  const path = recent
    ? `/api/v1/parts/parts_to_order/${branch}/${recent}`
    : `/api/v1/parts/parts_to_order/${branch}`;
  const res = await fetchWithAuth(path, {}, token);
  if (!res.ok) throw new Error("Failed to fetch parts to order");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get list of warehouses.
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getWarehouses(token) {
  const res = await fetchWithAuth("/api/v1/parts/warehouses", {}, token);
  if (!res.ok) throw new Error("Failed to fetch warehouses");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Add a part to a work order (POST /api/v1/parts/post).
 * @param {{ WONo: number|string; PartNo: string; Warehouse: string; Qty: number; Section: string; RepairCode?: string; BOQty?: number }} data
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function addPartToOrder(data, token) {
  const res = await fetchWithAuth("/api/v1/parts/post", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      WONo: data.WONo,
      PartNo: data.PartNo,
      Warehouse: data.Warehouse,
      Qty: data.Qty,
      Section: data.Section,
      RepairCode: data.RepairCode ?? data.Section,
      BOQty: data.BOQty,
    }),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to add part");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

// ─── Parts inventory module APIs ───────────────────────────────────────────

/**
 * Get part by ID (for inventory detail).
 * @param {number|string} id
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function getPartById(id, token) {
  const res = await fetchWithAuth(`/api/v1/parts/id/${encodeURIComponent(id)}`, {}, token);
  if (!res.ok) throw new Error("Failed to fetch part");
  return res.json();
}

/**
 * Get part by PartNo and Warehouse (inventory detail).
 * @param {string} partNo
 * @param {string} warehouse
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function getPart(partNo, warehouse, token) {
  const res = await fetchWithAuth(
    `/api/v1/parts/${encodeURIComponent(partNo)}/${encodeURIComponent(warehouse)}`,
    {},
    token
  );
  if (!res.ok) throw new Error("Failed to fetch part");
  return res.json();
}

/**
 * Get parts groups (for part creation/editing).
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getPartsGroups(token) {
  const res = await fetchWithAuth("/api/v1/parts/groups", {}, token);
  if (!res.ok) throw new Error("Failed to fetch parts groups");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get stale/seldom-used parts.
 * @param {number} [days] - Optional days threshold
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getStaleParts(days, token) {
  const path = days ? `/api/v1/parts/parts_stale/${days}` : "/api/v1/parts/parts_stale";
  const res = await fetchWithAuth(path, {}, token);
  if (!res.ok) throw new Error("Failed to fetch stale parts");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get consignment orders.
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getConsignmentOrders(token) {
  const res = await fetchWithAuth("/api/v1/parts/consignment_orders", {}, token);
  if (!res.ok) throw new Error("Failed to fetch consignment orders");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get part requisitions (all equipment).
 * Uses equipment API - no serialNo = all requisitions.
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getPartRequisitions(token) {
  const res = await fetchWithAuth("/api/v1/equipment/requisitions", {}, token);
  if (!res.ok) throw new Error("Failed to fetch requisitions");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get backordered parts (parts module - uses purchase_order/all_back_orders).
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getBackOrderedParts(token) {
  const res = await fetchWithAuth("/api/v1/purchase_order/all_back_orders", {}, token);
  if (!res.ok) throw new Error("Failed to fetch backordered parts");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get parts in a bin (for scan/barcode lookup).
 * @param {string} binNo - Bin number (from barcode/QR scan)
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getBinParts(binNo, token) {
  const res = await fetchWithAuth(
    `/api/v1/parts/bin/${encodeURIComponent(binNo)}`,
    {},
    token
  );
  if (!res.ok) throw new Error("Failed to fetch bin parts");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Upload a price file (Toyota or Crown format).
 * Vendor is auto-detected from filename: "dlfleet" = Crown, else Toyota.
 * @param {File} file
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function uploadPriceFile(file, token) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetchWithAuth("/api/v1/parts/price/batch", {
    method: "POST",
    body: formData,
    headers: {},
  }, token);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to upload price file");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Get parts with avg cost (for Avg Cost page).
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getAvgCostParts(token) {
  const res = await fetchWithAuth("/api/v1/parts/avg_cost/", {}, token);
  if (!res.ok) throw new Error("Failed to fetch avg cost parts");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get active inventory counts.
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getActiveCounts(token) {
  const res = await fetchWithAuth("/api/v1/parts/active_counts", {}, token);
  if (!res.ok) throw new Error("Failed to fetch active counts");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get parts for an inventory count.
 * @param {string} inventoryId
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getCountSearch(inventoryId, token) {
  const res = await fetchWithAuth(
    `/api/v1/parts/search_count/${encodeURIComponent(inventoryId)}`,
    {},
    token
  );
  if (!res.ok) throw new Error("Failed to fetch count parts");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Update a part count (pass or fail with value).
 * @param {{ InventoryID: string; Warehouse: string; PartNo: string; Count: number }} data
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function updateCount(data, token) {
  const res = await fetchWithAuth("/api/v1/parts/count/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to update count");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Update count header (ExcludeNew, ExcludeDelete).
 * @param {{ InventoryID: string; ExcludeNew: number; ExcludeDelete: number }} data
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function updateCountHeader(data, token) {
  const res = await fetchWithAuth("/api/v1/parts/count_header/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to update count header");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Create a new inventory count.
 * @param {{ InventoryID: string; Warehouse1: string; ExcludeNew?: number; ExcludeDelete?: number }} data
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function createInventoryCount(data, token) {
  const res = await fetchWithAuth("/api/v1/parts/count/new", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      InventoryID: data.InventoryID,
      Warehouse1: data.Warehouse1,
      ExcludeNew: data.ExcludeNew ?? 0,
      ExcludeDelete: data.ExcludeDelete ?? 0,
    }),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to create inventory count");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Transfer parts between warehouses.
 * @param {{ Qty: number; PartNo: string; Warehouse: string; toWarehouse: string }} data
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function transferParts(data, token) {
  const res = await fetchWithAuth("/api/v1/parts/transfer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to transfer parts");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Update a part's average cost.
 * @param {{ Warehouse: string; PartNo: string; AvgCost: number|string }} data
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function updateAvgCost(data, token) {
  const res = await fetchWithAuth("/api/v1/parts/avg_cost/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to update avg cost");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

// ─── Assembly (BOM) APIs ───────────────────────────────────────────────────

/**
 * Get all assemblies.
 * @param {string} token
 * @returns {Promise<Array<{ id: number; equipment_name: string; assembly_name: string; estimated_completion_time: string; totalCost: number; totalList: number }>>}
 */
export async function getAssemblies(token) {
  const res = await fetchWithAuth("/api/v1/parts/assemblies", {}, token);
  if (!res.ok) throw new Error("Failed to fetch assemblies");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get assembly by ID.
 * @param {number|string} id
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function getAssembly(id, token) {
  const res = await fetchWithAuth(`/api/v1/parts/assembly/${encodeURIComponent(id)}`, {}, token);
  if (!res.ok) throw new Error("Failed to fetch assembly");
  return res.json();
}

/**
 * Upload a document/image to an assembly.
 * @param {number|string} assemblyId
 * @param {File} file
 * @param {string} token
 * @returns {Promise<void>}
 */
export async function uploadAssemblyImage(assemblyId, file, token) {
  const formData = new FormData();
  formData.append("id", String(assemblyId));
  formData.append("file", file);

  const res = await fetchWithAuth("/api/v1/parts/assembly_image/", {
    method: "POST",
    body: formData,
    headers: {},
  }, token);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `Failed to upload ${file.name}`);
  }
}

/**
 * Add a part to an assembly.
 * @param {{ id: number|string; partNo: string; warehouse: string; qty: number }} data
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function addAssemblyPart(data, token) {
  const res = await fetchWithAuth("/api/v1/parts/assembly/parts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: data.id,
      partNo: data.partNo,
      warehouse: data.warehouse,
      qty: data.qty,
      description: data.description,
      cost: data.cost,
    }),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to add part");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Add a misc item to an assembly.
 * @param {{ id: number|string; misc: string; qty: number }} data
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function addAssemblyMisc(data, token) {
  const res = await fetchWithAuth("/api/v1/parts/assembly/parts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: data.id,
      misc: data.misc,
      qty: data.qty,
    }),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to add misc");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Get assembly documents/images metadata.
 * @param {number|string} assemblyId
 * @param {string} token
 * @returns {Promise<Array<{ ID: number; FileName: string; FilePath?: string }>>}
 */
export async function getAssemblyImagesMetadata(assemblyId, token) {
  const res = await fetchWithAuth(
    `/api/v1/parts/assembly_metadata/${encodeURIComponent(assemblyId)}`,
    {},
    token
  );
  if (!res.ok) throw new Error("Failed to fetch assembly documents");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Create a new assembly.
 * @param {{ model: string; name: string; estimated_completion_time?: string }} data
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function createAssembly(data, token) {
  const res = await fetchWithAuth("/api/v1/parts/assembly/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: data.model,
      name: data.name,
      estimated_completion_time: data.estimated_completion_time ?? "0",
    }),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to create assembly");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Trigger reprice after price file upload (updates parts prices).
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function repriceParts(token) {
  const res = await fetchWithAuth("/api/v1/parts/reprice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to reprice parts");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

// ─── Parts KPI APIs ─────────────────────────────────────────────────────────

function toYMD(d) {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

/**
 * Get fill rate by parts group for date range.
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @param {string} [warehouse] - Optional warehouse filter
 * @param {string} token
 * @returns {Promise<Array<{ PartsGroup, Total, Initial, Less, FillRate }>>}
 */
export async function getFillRate(startDate, endDate, warehouse, token) {
  const start = toYMD(startDate);
  const end = toYMD(endDate);
  if (!start || !end) return [];
  let path = `/api/v1/parts/fill_rate/${encodeURIComponent(start)}/${encodeURIComponent(end)}`;
  if (warehouse) path += `/${encodeURIComponent(warehouse)}`;
  const res = await fetchWithAuth(path, {}, token);
  if (!res.ok) throw new Error("Failed to fetch fill rate");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get inventory turns by part for date range.
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @param {string} [warehouse] - Optional warehouse filter
 * @param {string} token
 * @returns {Promise<Array<{ PartNo, InventoryTurns }>>}
 */
export async function getInventoryTurns(startDate, endDate, warehouse, token) {
  const start = toYMD(startDate);
  const end = toYMD(endDate);
  if (!start || !end) return [];
  let path = `/api/v1/parts/inventory_turns/${encodeURIComponent(start)}/${encodeURIComponent(end)}`;
  if (warehouse) path += `/${encodeURIComponent(warehouse)}`;
  const res = await fetchWithAuth(path, {}, token);
  if (!res.ok) throw new Error("Failed to fetch inventory turns");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get parts orders for date range (e.g. last 24h).
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @param {string} [warehouse] - Optional warehouse filter
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getPartsOrders(startDate, endDate, warehouse, token) {
  const start = toYMD(startDate);
  const end = toYMD(endDate);
  if (!start || !end) return [];
  let path = `/api/v1/parts/orders/${encodeURIComponent(start)}/${encodeURIComponent(end)}`;
  if (warehouse) path += `/${encodeURIComponent(warehouse)}`;
  const res = await fetchWithAuth(path, {}, token);
  if (!res.ok) throw new Error("Failed to fetch parts orders");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get stock-to-critical by branch for date range.
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @param {string} token
 * @returns {Promise<Array<{ POBranch, StockToCritical }>>}
 */
export async function getStockToCritical(startDate, endDate, token) {
  const start = toYMD(startDate);
  const end = toYMD(endDate);
  if (!start || !end) return [];
  const res = await fetchWithAuth(
    `/api/v1/parts/stock_to_critical/${encodeURIComponent(start)}/${encodeURIComponent(end)}`,
    {},
    token
  );
  if (!res.ok) throw new Error("Failed to fetch stock to critical");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get months on hand by part (optionally by warehouse).
 * @param {string} [warehouse] - Optional warehouse filter
 * @param {string} token
 * @returns {Promise<Array<{ PartNo, Cost, Qty, MonthsOnHand }>>}
 */
export async function getMonthsOnHand(warehouse, token) {
  let path = "/api/v1/parts/months_on_hand";
  if (warehouse) path += `/${encodeURIComponent(warehouse)}`;
  const res = await fetchWithAuth(path, {}, token);
  if (!res.ok) throw new Error("Failed to fetch months on hand");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get parts overview (total inventory cost).
 * @param {string} [warehouse] - Optional warehouse filter
 * @param {string} token
 * @returns {Promise<{ TotalInventoryCost?: number }>}
 */
export async function getPartsOverview(warehouse, token) {
  let path = "/api/v1/parts/overview";
  if (warehouse) path += `/${encodeURIComponent(warehouse)}`;
  const res = await fetchWithAuth(path, {}, token);
  if (!res.ok) throw new Error("Failed to fetch parts overview");
  const data = await res.json();
  return data && typeof data === "object" ? data : {};
}

/**
 * Get obsolete inventory.
 * @param {string} [warehouse] - Optional warehouse filter
 * @param {string} token
 * @returns {Promise<Array<{ PartNo, Warehouse, Description, OnHand, Cost, ObsolescenceRate, ObsoleteValue }>>}
 */
export async function getObsoleteInventory(warehouse, token) {
  let path = "/api/v1/parts/obsolete";
  if (warehouse) path += `/${encodeURIComponent(warehouse)}`;
  const res = await fetchWithAuth(path, {}, token);
  if (!res.ok) throw new Error("Failed to fetch obsolete inventory");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get current backorders (for Daily Backorder Report).
 * @param {string} [dept] - Optional dept filter
 * @param {string} [branch] - Optional branch filter
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getBackorders(dept, branch, token) {
  let path = "/api/v1/parts/backorders";
  if (dept) path += `/${encodeURIComponent(dept)}`;
  if (branch) path += `/${encodeURIComponent(branch)}`;
  const res = await fetchWithAuth(path, {}, token);
  if (!res.ok) throw new Error("Failed to fetch backorders");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get inventory value (PartNo, Description, PartsGroup, Warehouse, Cost, OnHand, Value).
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getInventoryValue(token) {
  const res = await fetchWithAuth("/api/v1/parts/inventory_value/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  }, token);
  if (!res.ok) throw new Error("Failed to fetch inventory value");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
