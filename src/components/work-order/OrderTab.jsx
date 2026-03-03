"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getBranches, getBranchDepts } from "@/lib/api/dispatch";
import { getSalesCodes, getExpenseCodes } from "@/lib/api/customer";
import { getSalesmen } from "@/lib/api/admin";
import { updateWorkOrder } from "@/lib/api/work-order";

function formatCurrency(val) {
  if (val == null || val === "" || isNaN(Number(val))) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number(val));
}

function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { dateStyle: "medium" });
}

export default function OrderTab({ wo, billing, billToCustomer, token, onOrderUpdate }) {
  const [branches, setBranches] = useState([]);
  const [saleDepts, setSaleDepts] = useState([]);
  const [expDepts, setExpDepts] = useState([]);
  const [salesCodes, setSalesCodes] = useState([]);
  const [expenseCodes, setExpenseCodes] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [saving, setSaving] = useState(false);

  const saleBranch = String(wo?.SaleBranch ?? "");
  const saleDept = String(wo?.SaleDept ?? "");
  const expBranch = String(wo?.ExpBranch ?? "");
  const expDept = String(wo?.ExpDept ?? "");
  const custInfo = billToCustomer;

  useEffect(() => {
    if (!token) return;
    getBranches(token).then(setBranches);
  }, [token]);

  useEffect(() => {
    if (!token || !saleBranch) return;
    getBranchDepts(saleBranch, token).then(setSaleDepts);
  }, [token, saleBranch]);

  useEffect(() => {
    if (!token || !expBranch) return;
    getBranchDepts(expBranch, token).then(setExpDepts);
  }, [token, expBranch]);

  useEffect(() => {
    if (!token || !saleBranch || !saleDept) return;
    getSalesCodes(saleBranch, saleDept, token).then(setSalesCodes);
  }, [token, saleBranch, saleDept]);

  useEffect(() => {
    if (!token || !expBranch || !expDept) return;
    getExpenseCodes(expBranch, expDept, token).then(setExpenseCodes);
  }, [token, expBranch, expDept]);

  useEffect(() => {
    if (!token) return;
    getSalesmen(token).then(setSalesmen);
  }, [token]);

  const handleSave = async (payload, actionName = "Update") => {
    if (!token || !wo?.WONo || saving) return;
    setSaving(true);
    try {
      await updateWorkOrder({ WONo: wo.WONo, ...payload }, actionName, token);
      onOrderUpdate?.(payload);
    } finally {
      setSaving(false);
    }
  };

  const openWOForEquipment = wo?.openWOForEquipment ?? [];
  const openDate = wo?.OpenDate ? formatDate(wo.OpenDate) : "";
  const changedDate = wo?.ChangedDate ? formatDate(wo.ChangedDate) : "";

  return (
    <div className="space-y-6 py-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sale & Expense Information */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h5 className="font-semibold text-slate-800 dark:text-slate-200">Sale & Expense Information</h5>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Sale Information */}
            <div className="space-y-4">
              <h6 className="font-medium text-slate-700 dark:text-slate-300">Sale Information</h6>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select
                  value={saleBranch}
                  onValueChange={(v) => handleSave({ SaleBranch: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.Number} value={String(b.Number)}>
                        {b.Number}: {b.Name || ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={saleDept}
                  onValueChange={(v) => handleSave({ SaleDept: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose department" />
                  </SelectTrigger>
                  <SelectContent>
                    {saleDepts.map((d) => (
                      <SelectItem key={d.Dept} value={String(d.Dept)}>
                        {d.Dept}: {d.Title || ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sale Code</Label>
                <Select
                  value={wo?.SaleCode || ""}
                  onValueChange={(v) => handleSave({ SaleCode: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose code" />
                  </SelectTrigger>
                  <SelectContent>
                    {salesCodes.map((c) => (
                      <SelectItem key={c.Code} value={String(c.Code)}>
                        {c.Code}: {c.GeneralDescription || ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSave({ SaleBranch: saleBranch, SaleDept: saleDept, SaleCode: wo?.SaleCode }, "Update & Reprocess Line Items")}
                disabled={saving}
              >
                Update & Reprocess Line Items
              </Button>
            </div>

            {/* Expense Information */}
            <div className="space-y-4">
              <h6 className="font-medium text-slate-700 dark:text-slate-300">Expense Information</h6>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select
                  value={expBranch}
                  onValueChange={(v) => handleSave({ ExpBranch: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.Number} value={String(b.Number)}>
                        {b.Number}: {b.Name || ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={expDept}
                  onValueChange={(v) => handleSave({ ExpDept: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose department" />
                  </SelectTrigger>
                  <SelectContent>
                    {expDepts.map((d) => (
                      <SelectItem key={d.Dept} value={String(d.Dept)}>
                        {d.Dept}: {d.Title || ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Expense Code</Label>
                <Select
                  value={wo?.ExpCode || ""}
                  onValueChange={(v) => handleSave({ ExpCode: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose code" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCodes.map((c) => (
                      <SelectItem key={c.Code} value={String(c.Code)}>
                        {c.Code}: {c.Description || ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Other Information */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h5 className="font-semibold text-slate-800 dark:text-slate-200">Other Information</h5>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Salesman</Label>
              <Select
                value={wo?.Salesman || ""}
                onValueChange={(v) => handleSave({ Salesman: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose one" />
                </SelectTrigger>
                <SelectContent>
                  {salesmen.map((p, i) => (
                    <SelectItem key={p.Number || p.Name || i} value={String(p.Name || "")}>
                      {p.Name || ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Writer</Label>
              <Input
                defaultValue={wo?.Writer ?? ""}
                onBlur={(e) => {
                  const v = e.target.value;
                  if (v !== (wo?.Writer ?? "")) handleSave({ Writer: v });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Ship Contact</Label>
              <Input
                defaultValue={wo?.ShipContact ?? ""}
                onBlur={(e) => {
                  const v = e.target.value;
                  if (v !== (wo?.ShipContact ?? "")) handleSave({ ShipContact: v });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Ship Phone</Label>
              <Input
                defaultValue={wo?.ShipPhone ?? ""}
                onBlur={(e) => {
                  const v = e.target.value;
                  if (v !== (wo?.ShipPhone ?? "")) handleSave({ ShipPhone: v });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Associated WO/Doc #</Label>
              <Input
                defaultValue={wo?.AssociatedWONo ?? ""}
                onBlur={(e) => {
                  const v = e.target.value;
                  if (v !== (wo?.AssociatedWONo ?? "")) handleSave({ AssociatedWONo: v });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Shop Quote Hours</Label>
              <Input
                defaultValue={wo?.ShopQuoteHours ?? ""}
                onBlur={(e) => {
                  const v = e.target.value;
                  if (v !== (wo?.ShopQuoteHours ?? "")) handleSave({ ShopQuoteHours: v });
                }}
              />
            </div>
            <hr className="border-slate-200 dark:border-slate-700" />
            <div className="text-sm text-slate-500 dark:text-slate-400 space-y-1">
              <p><em>Created by {wo?.OpenBy || "—"} on {openDate}</em></p>
              {wo?.ChangedBy && <p><em>Changed by {wo.ChangedBy} on {changedDate}</em></p>}
            </div>
          </div>
        </div>
      </div>

      {/* Additional Order Information */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h5 className="font-semibold text-slate-800 dark:text-slate-200">Additional Order Information</h5>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Label>Purchase Order (PO) #</Label>
            <Input
              defaultValue={wo?.PONo ?? ""}
              onBlur={(e) => {
                const v = e.target.value;
                if (v !== wo?.PONo) handleSave({ PONo: v });
              }}
            />
          </div>
          {openWOForEquipment.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200">Equipment Open Orders</h4>
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 max-h-40">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                      <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">WO Number</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openWOForEquipment.map((order) => (
                      <tr key={order.WONo} className="border-t border-slate-100 dark:border-slate-700/50">
                        <td className="px-4 py-2">
                          <Link
                            href={`/work-orders/${order.WONo}`}
                            className="font-medium text-cyan-600 dark:text-cyan-400 hover:underline"
                          >
                            {order.WONo}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{order.Name || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-semibold">Full Maintenance / GM: </span>
              <span className="text-slate-400 dark:text-slate-500">{wo?.GuaranteedMaintenance === -1 ? "Yes" : "No"}</span>
            </p>
            <p>
              <span className="font-semibold">Terms: </span>
              <span className="italic text-slate-400 dark:text-slate-500">{custInfo?.Terms || "N/A"}</span>
            </p>
            <p>
              <span className="font-semibold">Credit Limit: </span>
              <span className="italic text-slate-400 dark:text-slate-500">{formatCurrency(custInfo?.CreditLimit)}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
