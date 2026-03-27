"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  CreditCard,
  List,
  PieChart,
  ChevronDown,
  ChevronUp,
  Plus,
  ChartGantt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSectionWorkflows, getSectionsList, updateSectionWorkflow, getAccountingBreakdown } from "@/lib/api/work-order";
import AddSectionDialog from "./AddSectionDialog";
import GanttPlanningView from "./GanttPlanningView";

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
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" });
}

function filterBreakdownBySection(rows, section) {
  if (!Array.isArray(rows) || !section) return Array.isArray(rows) ? rows : [];
  const normalizedSection = String(section).trim().toLowerCase();
  if (!normalizedSection) return rows;
  const isMeaningfulSectionValue = (val) => {
    if (typeof val !== "string") return false;
    const normalized = val.trim().toLowerCase();
    return normalized !== "" && normalized !== "n/a" && normalized !== "na" && normalized !== "none" && normalized !== "null" && normalized !== "undefined" && normalized !== "-";
  };

  const sectionKeys = [
    "Section",
    "section",
    "SectionNo",
    "sectionNo",
    "RepairCode",
    "repairCode",
    "TaskSection",
    "taskSection",
    "ProjectSection",
    "projectSection",
  ];

  const hasSectionMetadata = rows.some((row) =>
    sectionKeys.some((key) => {
      const val = row?.[key];
      return isMeaningfulSectionValue(val);
    })
  );

  // If API didn't include section metadata, avoid hiding valid rows.
  if (!hasSectionMetadata) return rows;

  return rows.filter((row) =>
    sectionKeys.some((key) => {
      const val = row?.[key];
      return isMeaningfulSectionValue(val) && val.trim().toLowerCase() === normalizedSection;
    })
  );
}

function GppBadge({ value }) {
  const v = Number(value);
  if (isNaN(v)) return <span>—</span>;
  const cls =
    v >= 30
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      : v >= 15
        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {v}%
    </span>
  );
}

/** Cost breakdown (wo-review-total) */
function CostBreakdown({ calculations }) {
  const calc = calculations ?? {};
  const sales = calc.sales ?? {};
  const costs = calc.costs ?? {};
  const gpp = calc.gpp ?? {};
  const paymentDetails = calc.paymentDetails ?? [];

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
      <div className="border-b border-border px-6 py-4">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <PieChart className="h-5 w-5 text-primary" />
          Cost Breakdown
        </h2>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-4 border border-blue-100 dark:border-blue-900/50">
            <p className="mb-1 text-sm font-medium text-muted-foreground">Total Sales</p>
            <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
              {formatCurrency(sales.total)}
            </p>
          </div>
          <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-4 border border-red-100 dark:border-red-900/50">
            <p className="mb-1 text-sm font-medium text-muted-foreground">Total Costs</p>
            <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
              {formatCurrency(costs.total)}
            </p>
          </div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-4 border border-amber-100 dark:border-amber-900/50">
            <p className="mb-1 text-sm font-medium text-muted-foreground">Total Tax</p>
            <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400">
              {formatCurrency(calc.tax)}
            </p>
          </div>
          <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-4 border border-green-100 dark:border-green-900/50">
            <p className="mb-1 text-sm font-medium text-muted-foreground">Profit Margin (GP)</p>
            <p className="text-2xl font-semibold text-green-600 dark:text-green-400">
              {gpp.total != null ? `${gpp.total}%` : "—"}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto mt-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-3 text-left font-medium text-muted-foreground">Category</th>
                <th className="py-3 text-left font-medium text-muted-foreground">Parts</th>
                <th className="py-3 text-left font-medium text-muted-foreground">Labor</th>
                <th className="py-3 text-left font-medium text-muted-foreground">Misc</th>
                <th className="py-3 text-left font-medium text-muted-foreground">Rental</th>
                <th className="py-3 text-left font-medium text-muted-foreground">Equipment</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50 hover:bg-muted/30">
                <td className="py-3 font-medium text-foreground">Sale</td>
                <td className="py-3 text-muted-foreground">{formatCurrency(sales.parts)}</td>
                <td className="py-3 text-muted-foreground">{formatCurrency(sales.labor)}</td>
                <td className="py-3 text-muted-foreground">{formatCurrency(sales.misc)}</td>
                <td className="py-3 text-muted-foreground">{formatCurrency(sales.rental)}</td>
                <td className="py-3 text-muted-foreground">{formatCurrency(sales.equipment)}</td>
              </tr>
              <tr className="border-b border-border/50 hover:bg-muted/30">
                <td className="py-3 font-medium text-foreground">Cost</td>
                <td className="py-3 text-muted-foreground">{formatCurrency(costs.parts)}</td>
                <td className="py-3 text-muted-foreground">{formatCurrency(costs.labor)}</td>
                <td className="py-3 text-muted-foreground">{formatCurrency(costs.misc)}</td>
                <td className="py-3 text-muted-foreground">{formatCurrency(costs.rental)}</td>
                <td className="py-3 text-muted-foreground">{formatCurrency(costs.equipment)}</td>
              </tr>
              <tr className="border-b border-border/50 hover:bg-muted/30">
                <td className="py-3 font-medium text-foreground">Margin (GP)</td>
                <td className="py-3"><GppBadge value={gpp.parts} /></td>
                <td className="py-3"><GppBadge value={gpp.labor} /></td>
                <td className="py-3"><GppBadge value={gpp.misc} /></td>
                <td className="py-3"><GppBadge value={gpp.rental} /></td>
                <td className="py-3"><GppBadge value={gpp.equipment} /></td>
              </tr>
            </tbody>
          </table>
        </div>

        {paymentDetails.length > 0 && (
          <div className="mt-8">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <CreditCard className="h-5 w-5 text-primary" />
              Payments <span className="font-semibold text-primary">{formatCurrency(calc.paymentTotal)}</span>
            </h3>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Journal</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Account No</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentDetails.map((row, i) => (
                    <tr key={i} className="border-t border-border/50 even:bg-muted/30">
                      <td className="px-4 py-2 text-muted-foreground">{row.Journal ?? "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground">{row.AccountNo ?? "—"}</td>
                      <td className={`px-4 py-2 text-right tabular-nums font-medium ${Number(row.Amount) < 0 ? "text-primary" : "text-destructive"}`}>
                        {formatCurrency(row.Amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Line items table (wo-review-line-items) */
function LineItemsTable({ lineItems, obj, showCost }) {
  const items = lineItems ?? [];
  const subTotal = obj?.subTotal ?? 0;
  const tax = obj?.tax ?? 0;

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">No line items.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Item</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Qty/Hours</th>
            {showCost && <th className="px-4 py-3 text-right font-medium text-muted-foreground">Cost</th>}
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Billed</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr
              key={i}
              className={`border-b border-border/50 ${item.BOStatus === 1 ? "bg-muted/40" : ""}`}
            >
              <td className="py-2 px-4 text-muted-foreground">
                {item.CodeDescription || "Unknown"} ({item.Code || item.EntryType || "—"})
              </td>
              <td className="py-2 px-4 text-muted-foreground">
                {[item.ItemNo, item.ItemName].filter(Boolean).join(", ") || "—"}
              </td>
              <td className="py-2 px-4 text-foreground">{item.Description ?? "—"}</td>
              <td className="py-2 px-4 text-muted-foreground">{formatDate(item.ItemDate)}</td>
              <td className="py-2 px-4 text-right tabular-nums text-muted-foreground">
                {item.Qty != null ? Number(item.Qty).toFixed(2) : "—"}
              </td>
              {showCost && (
                <td className="py-2 px-4 text-right tabular-nums text-muted-foreground">
                  {item.Cost != null && item.Cost !== "N/A" ? formatCurrency(item.Cost) : (item.Cost ?? "—")}
                </td>
              )}
              <td className="py-2 px-4 text-right font-medium tabular-nums text-foreground">
                {formatCurrency(item.Extended)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border bg-muted/40">
            <td colSpan={showCost ? 5 : 4} className="px-4 py-3 font-medium text-foreground">
              Total Tax <span className="ml-2 text-primary">{formatCurrency(tax)}</span>
            </td>
            <td colSpan={2} className="px-4 py-3 text-right font-medium text-foreground">
              Total Billed <span className="ml-2 text-primary">{formatCurrency(subTotal)}</span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** Accounting ledger view (grouped by Journal) */
function AccountingView({ breakdown, formatCurrency, loading }) {
  if (loading) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Loading accounting breakdown…
      </div>
    );
  }
  const items = breakdown ?? [];
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No accounting breakdown for this section.
      </p>
    );
  }

  const groupBy = (arr, key) =>
    arr.reduce((acc, x) => {
      const k = x[key] ?? "";
      (acc[k] = acc[k] || []).push(x);
      return acc;
    }, {});

  const grouped = groupBy(items, "Journal");
  const journals = Object.keys(grouped).sort();

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Journal</th>
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Date</th>
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Account</th>
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Description</th>
            <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Amount</th>
          </tr>
        </thead>
        <tbody>
          {journals.map((journal) => {
            const rows = grouped[journal].sort((a, b) => (a.AccountNo || "").localeCompare(b.AccountNo || ""));
            const subTotal = rows.reduce((s, r) => s + (Number(r.Amount) || 0), 0);
            return (
              <React.Fragment key={String(journal || "ungrouped")}>
                {rows.map((item, i) => (
                  <tr
                    key={i}
                    className="border-b border-border/50 hover:bg-muted/30"
                  >
                    <td className="py-2 px-4 text-muted-foreground">
                      {i === 0 ? (journal || "—") : ""}
                    </td>
                    <td className="py-2 px-4 text-muted-foreground">
                      {item.APInvoiceDate || item.PostedDate || item.EffectiveDate
                        ? new Date(item.APInvoiceDate || item.PostedDate || item.EffectiveDate).toLocaleDateString("en-US", {
                            month: "2-digit",
                            day: "2-digit",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="py-2 px-4 text-muted-foreground">{item.AccountNo ?? "—"}</td>
                    <td className="py-2 px-4 text-foreground">
                      {(item.CombinedDescription || item.Description || item.ControlNo || item.CheckNo) || "—"}
                    </td>
                    <td className="py-2 px-4 text-right font-medium tabular-nums text-foreground">
                      {formatCurrency(item.Amount)}
                    </td>
                  </tr>
                ))}
                <tr className="border-b border-border bg-muted/30 font-medium">
                  <td className="py-2 px-4 text-muted-foreground" colSpan={4}>
                    Subtotal ({rows.length} items)
                  </td>
                  <td
                    className={`py-2 px-4 text-right tabular-nums ${subTotal < 0 ? "text-destructive" : "text-foreground"}`}
                  >
                    {formatCurrency(subTotal)}
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border bg-muted/40 font-semibold">
            <td className="py-3 px-4 text-foreground" colSpan={4}>
              Total
            </td>
            <td
              className={`py-3 px-4 text-right tabular-nums ${
                items.reduce((s, r) => s + (Number(r.Amount) || 0), 0) !== 0
                  ? "text-destructive"
                  : "text-primary"
              }`}
            >
              {formatCurrency(items.reduce((s, r) => s + (Number(r.Amount) || 0), 0))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** Section workflow steps (Open → Dispatch → In Progress → Final Review → Complete) */
function SectionWorkflowSteps({ workflows, currentId, group, sectionInfo, onSetWorkflow, disabled }) {
  if (!workflows?.length) return null;
  const lastId = Math.max(...workflows.map((w) => w.id), 0);

  return (
    <ul className="flex flex-wrap gap-2 list-none m-0 p-0">
      {workflows.map((wf) => {
        const isComplete = currentId > wf.id;
        const isCurrent = currentId === wf.id;
        const isLastStep = wf.id === lastId;
        const bg = isComplete
          ? "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200"
          : isCurrent
            ? isLastStep
              ? "bg-primary text-primary-foreground"
              : "bg-foreground text-background"
            : "bg-muted text-muted-foreground";
        return (
          <li key={wf.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSetWorkflow(group, wf.id, sectionInfo)}
              className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${bg} ${!disabled ? "hover:opacity-90 cursor-pointer" : "cursor-not-allowed opacity-70"}`}
            >
              {wf.name}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Section card (single section in showSmall layout) */
function SectionCard({
  group,
  grouping,
  wo,
  onlySections,
  onToggleSection,
  formatCurrency,
  sectionWorkflows,
  sectionWorkflowId,
  sectionInfo,
  onSetWorkflow,
  workflowUpdating,
  breakdown,
  breakdownLoading,
  onFetchBreakdown,
}) {
  const [mode, setMode] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const lineItems = grouping?.lineItems ?? [];

  const isChecked = onlySections.includes(group);

  useEffect(() => {
    if (mode && !breakdown?.length && !breakdownLoading && onFetchBreakdown) {
      onFetchBreakdown(group);
    }
  }, [mode, group, breakdown?.length, breakdownLoading, onFetchBreakdown]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <h3 className="text-lg font-semibold">{group || "N/A"}</h3>
          <SectionWorkflowSteps
            workflows={sectionWorkflows}
            currentId={sectionWorkflowId}
            group={group}
            sectionInfo={sectionInfo}
            onSetWorkflow={onSetWorkflow}
            disabled={workflowUpdating}
          />
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => onToggleSection(group)}
          >
            {isChecked ? (
              <span className="flex items-center gap-2 text-primary">
                <span className="flex h-4 w-4 items-center justify-center rounded border border-primary bg-primary">
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                </span>
                <span className="text-sm font-medium">Included</span>
              </span>
            ) : (
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="h-4 w-4 rounded border border-border" />
                <span className="text-sm font-medium">Include</span>
              </span>
            )}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={!mode ? "default" : "outline"}
            size="sm"
            onClick={() => setMode(false)}
            className="gap-2"
          >
            <List className="h-4 w-4" />
            Line Items
          </Button>
          <Button
            variant={mode ? "default" : "outline"}
            size="sm"
            onClick={() => setMode(true)}
            className="gap-2"
          >
            <PieChart className="h-4 w-4" />
            Accounting
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="p-4 sm:p-5">
          {!mode ? (
            <LineItemsTable lineItems={lineItems} obj={grouping} showCost={true} />
          ) : (
            <AccountingView
              breakdown={breakdown}
              formatCurrency={formatCurrency}
              loading={breakdownLoading}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function LineItemsTab({ wo, billing, token, onRefresh }) {
  const [onlySections, setOnlySections] = useState([]);
  const [sectionWorkflows, setSectionWorkflows] = useState([]);
  const [sectionWorkflowMap, setSectionWorkflowMap] = useState({});
  const [sectionInfoMap, setSectionInfoMap] = useState({});
  const [workflowUpdating, setWorkflowUpdating] = useState(false);
  const [breakdownMap, setBreakdownMap] = useState({});
  const [breakdownLoadingMap, setBreakdownLoadingMap] = useState({});
  const [showGantt, setShowGantt] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);

  const calc = billing?.calculations ?? {};
  const groups = calc.groups ?? [];
  const groupings = calc.groupings ?? {};
  const lineItems = billing?.lineItems ?? billing?.printableLineItems ?? [];
  const showSmall = true;

  useEffect(() => {
    if (!token || !wo?.WONo) return;
    const load = async () => {
      try {
        const [workflows, sections] = await Promise.all([
          getSectionWorkflows(token),
          getSectionsList(wo.WONo, token),
        ]);
        setSectionWorkflows(Array.isArray(workflows) ? workflows : []);
        const map = {};
        const infoMap = {};
        (sections || []).forEach((s) => {
          const title = s.title ?? s.SectionNo ?? "";
          const id = s.SectionWorkflowID != null && s.SectionWorkflowID !== "" ? Number(s.SectionWorkflowID) : 1;
          map[title] = id;
          infoMap[title] = { Branch: s.Branch, Dept: s.Dept };
        });
        setSectionWorkflowMap(map);
        setSectionInfoMap(infoMap);
      } catch {
        setSectionWorkflows([]);
      }
    };
    load();
  }, [token, wo?.WONo]);

  const toggleSection = (id) => {
    setOnlySections((prev) => {
      const idx = prev.indexOf(id);
      if (idx >= 0) {
        const next = [...prev];
        next.splice(idx, 1);
        return next;
      }
      return [...prev, id];
    });
  };

  const handleFetchBreakdown = async (section) => {
    if (!token || !wo?.WONo || breakdownLoadingMap[section]) return;
    setBreakdownLoadingMap((prev) => ({ ...prev, [section]: true }));
    try {
      const data = await getAccountingBreakdown(wo.WONo, token, section);
      setBreakdownMap((prev) => ({
        ...prev,
        [section]: filterBreakdownBySection(Array.isArray(data) ? data : [], section),
      }));
    } catch {
      setBreakdownMap((prev) => ({ ...prev, [section]: [] }));
    } finally {
      setBreakdownLoadingMap((prev) => ({ ...prev, [section]: false }));
    }
  };

  const handleSetWorkflow = async (group, workflowId, sectionInfo) => {
    if (!token || !wo?.WONo || workflowUpdating) return;
    setWorkflowUpdating(true);
    try {
      await updateSectionWorkflow(
        {
          WONo: wo.WONo,
          title: group,
          Branch: sectionInfo?.Branch ?? wo.SaleBranch,
          Dept: sectionInfo?.Dept ?? wo.SaleDept,
          SectionWorkflowID: workflowId,
        },
        token
      );
      setSectionWorkflowMap((prev) => ({ ...prev, [group]: workflowId }));
      toast.success("Section workflow updated");
    } catch (err) {
      toast.error(err?.message || "Failed to update section workflow");
    } finally {
      setWorkflowUpdating(false);
    }
  };

  const sectionsFromApi = Object.keys(sectionInfoMap);
  const sectionsFromBilling = groups.length > 0 ? groups : (lineItems.length > 0 ? [...new Set(lineItems.map((i) => i.Section).filter(Boolean))] : []);
  const sectionList = [...sectionsFromBilling, ...sectionsFromApi.filter((s) => !sectionsFromBilling.includes(s))];

  const handleSectionAdded = () => {
    onRefresh?.();
    if (wo?.WONo && token) {
      getSectionsList(wo.WONo, token)
        .then((sections) => {
          const map = {};
          const infoMap = {};
          (sections || []).forEach((s) => {
            const title = s.title ?? s.SectionNo ?? "";
            const id = s.SectionWorkflowID != null && s.SectionWorkflowID !== "" ? Number(s.SectionWorkflowID) : 1;
            map[title] = id;
            infoMap[title] = { Branch: s.Branch, Dept: s.Dept };
          });
          setSectionWorkflowMap(map);
          setSectionInfoMap(infoMap);
        })
        .catch(() => {});
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div />
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddSection(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Section
          </Button>
          <Button
            variant={showGantt ? "default" : "outline"}
            size="sm"
            onClick={() => setShowGantt(!showGantt)}
            className="gap-2"
          >
            <ChartGantt className="h-4 w-4" />
            {showGantt ? "Show Line Items" : "Gantt Planning"}
          </Button>
        </div>
      </div>

      {showGantt ? (
        <GanttPlanningView woNo={wo?.WONo} token={token} />
      ) : showSmall && sectionList.length > 0 ? (
        <>
          <CostBreakdown calculations={calc} />
          <div className="space-y-4">
            {sectionList.map((group, index) => {
              const grouping = groupings[group];
              const sectionLineItems = grouping?.lineItems ?? lineItems.filter((i) => (i.Section || "") === (group || ""));
              const sectionSubTotal = grouping?.subTotal ?? sectionLineItems.reduce((s, i) => s + (Number(i.Extended) || 0), 0);
              const sectionTax = grouping?.tax ?? 0;
              const effectiveGrouping = grouping ?? {
                lineItems: sectionLineItems,
                subTotal: sectionSubTotal,
                tax: sectionTax,
                breakdown: [],
              };
              const sectionWorkflowId = sectionWorkflowMap[group] ?? grouping?.SectionWorkflowID ?? 1;
              const sectionInfo = sectionInfoMap[group] ?? { Branch: wo?.SaleBranch, Dept: wo?.SaleDept };
              return (
                <SectionCard
                  key={`${String(group || "ungrouped")}-${index}`}
                  group={group}
                  grouping={effectiveGrouping}
                  wo={wo}
                  onlySections={onlySections}
                  onToggleSection={toggleSection}
                  formatCurrency={formatCurrency}
                  sectionWorkflows={sectionWorkflows}
                  sectionWorkflowId={sectionWorkflowId}
                  sectionInfo={sectionInfo}
                  onSetWorkflow={handleSetWorkflow}
                  workflowUpdating={workflowUpdating}
                  breakdown={breakdownMap[group]}
                  breakdownLoading={breakdownLoadingMap[group]}
                  onFetchBreakdown={handleFetchBreakdown}
                />
              );
            })}
          </div>
        </>
      ) : (
        <>
          <CostBreakdown calculations={calc} />
          <div className="space-y-4">
            <LineItemsTable lineItems={lineItems} obj={calc} showCost={true} />
          </div>
        </>
      )}

      <AddSectionDialog
        open={showAddSection}
        onOpenChange={setShowAddSection}
        wo={wo}
        token={token}
        onSuccess={handleSectionAdded}
      />
    </div>
  );
}
