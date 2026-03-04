/**
 * Purchase Order API – uses fetchWithAuth with JWT token.
 * Backend: /api/v1/purchase_order
 */

import { fetchWithAuth } from "../api";

/**
 * Get a single purchase order by PONo.
 * @param {number|string} poNo
 * @param {string} token
 * @returns {Promise<{ po: object; parts: Array; equipment: Array; misc: Array; calculations: object }>}
 */
export async function getPurchaseOrder(poNo, token) {
  const res = await fetchWithAuth(
    `/api/v1/purchase_order/${encodeURIComponent(poNo)}`,
    {},
    token
  );
  if (!res.ok) {
    if (res.status === 404) throw new Error("Purchase order not found");
    throw new Error("Failed to fetch purchase order");
  }
  return res.json();
}

/**
 * Search purchase orders by query.
 * @param {string} query - PO number, vendor name, etc.
 * @param {boolean} [includeClosed] - Include closed POs
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function searchPurchaseOrders(query, includeClosed, token) {
  const q = encodeURIComponent(query || "");
  const closed = includeClosed ? "1" : "0";
  const res = await fetchWithAuth(
    `/api/v1/purchase_order/search/${q}/${closed}`,
    {},
    token
  );
  if (!res.ok) throw new Error("Search failed");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get open purchase orders for a branch/dept.
 * @param {number|string} dept
 * @param {number|string} branch
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getOpenPurchaseOrders(dept, branch, token) {
  const res = await fetchWithAuth(
    `/api/v1/purchase_order/open/${dept}/${branch}`,
    {},
    token
  );
  if (!res.ok) throw new Error("Failed to fetch open purchase orders");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get open purchase orders for a vendor.
 * @param {number|string} vendorNo
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getVendorOpenOrders(vendorNo, token) {
  const res = await fetchWithAuth(
    `/api/v1/purchase_order/vendor/open/${vendorNo}`,
    {},
    token
  );
  if (!res.ok) throw new Error("Failed to fetch vendor orders");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get all backordered parts.
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
 * Create a new purchase order.
 * @param {object} data - POBranch, PODept, VendorNo, VendorName, ShipTo*, etc.
 * @param {string} token
 * @returns {Promise<{ PONo: string }>}
 */
export async function createPO(data, token) {
  const res = await fetchWithAuth("/api/v1/purchase_order/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to create purchase order");
  }
  return res.json();
}

/**
 * Add a part to a purchase order.
 * @param {object} data - OrderNo, PartNo, Description, Qty, CostEach, Warehouse, etc.
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function addPartToPO(data, token) {
  const res = await fetchWithAuth("/api/v1/purchase_order/parts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to add part");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Add misc item to a purchase order.
 * @param {object} data - PONo, Description, Amount, InvAccountObj, etc.
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function addMiscToPO(data, token) {
  const res = await fetchWithAuth("/api/v1/purchase_order/misc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to add misc item");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Add equipment to a purchase order.
 * @param {object} data - PONo, Description, SerialNo, Amount, InvAccount, etc.
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function addEquipmentToPO(data, token) {
  const res = await fetchWithAuth("/api/v1/purchase_order/equipment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to add equipment");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Receive items on a purchase order line.
 * @param {object} data - ID, RecvQty
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function receivePOItems(data, token) {
  const res = await fetchWithAuth("/api/v1/purchase_order/receive", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to receive items");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Delete a line item from a purchase order.
 * @param {number|string} id - Line item ID
 * @param {string} type - "part" | "equipment" | "misc"
 * @param {string} token
 */
export async function deletePOLineItem(id, type, token) {
  const res = await fetchWithAuth(
    `/api/v1/purchase_order/line_item/${id}/${type}`,
    { method: "DELETE" },
    token
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to delete line item");
  }
}

/**
 * Get purchase order PDF as blob URL.
 * @param {number|string} poNo
 * @param {string} token
 * @returns {Promise<string>} Object URL (caller should revoke when done)
 */
export async function getPOPdfUrl(poNo, token) {
  const res = await fetchWithAuth("/api/v1/purchase_order/pdf/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ PONo: poNo }),
  }, token);
  if (!res.ok) {
    const text = await res.text();
    let msg = "Failed to generate PO PDF";
    try {
      const j = JSON.parse(text);
      if (j?.message) msg = j.message;
    } catch {
      if (text) msg = text.slice(0, 100);
    }
    throw new Error(msg);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
