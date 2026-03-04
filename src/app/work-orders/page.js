"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Plus,
  RefreshCw,
  Paperclip,
  CreditCard,
  Pencil,
  Search,
  BarChart3,
  MapPin,
  Truck,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getViewedWOs, getDisplayStatus, searchWOsAdvanced } from "@/lib/api/work-order";
import { WorkOrderSearchCombobox } from "@/components/WorkOrderSearchCombobox";
import { BranchDeptFilter } from "@/components/BranchDeptFilter";
import { CustomerCombobox } from "@/components/CustomerCombobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useBranchDeptFilter } from "@/hooks/use-branch-dept-filter";
import { fadeIn, fadeInUp, staggerContainer, staggerItem } from "@/lib/motion";

const ACTION_CARDS = [
  {
    title: "Create Work Order",
    text: "Create a new work order.",
    href: "/work-orders/create",
    icon: Plus,
    permissions: ["InvoiceOpen"],
  },
  {
    title: "Recurring Orders",
    text: "Close and open new recurring orders.",
    href: "/work-orders/recurring",
    icon: RefreshCw,
    permissions: ["InvoiceClose"],
  },
  {
    title: "Close / Distribute Orders",
    text: "Centralized closing and distribution point.",
    href: "/work-orders/distribute",
    icon: Paperclip,
    permissions: ["InvoiceClose"],
  },
  {
    title: "Credit Approval",
    text: "Approve pending credit items.",
    href: "/work-orders/credit",
    icon: CreditCard,
    permissions: ["SDIAccounting"],
  },
  {
    title: "Workflow",
    text: "Approve work items to be sent to customer.",
    href: "/work-orders/workflow",
    icon: Pencil,
    permissions: ["SDIAccounting"],
  },
  {
    title: "Reports Dashboard",
    text: "Interactive Reports.",
    href: "/work-orders/reports",
    icon: BarChart3,
    permissions: ["SDIAccounting"],
  },
];

const statusStyles = {
  Open: "bg-cyan-50 border-cyan-200 text-cyan-700 dark:bg-cyan-950/50 dark:border-cyan-800 dark:text-cyan-300",
  Accepted:
    "bg-cyan-50 border-cyan-200 text-cyan-700 dark:bg-cyan-950/50 dark:border-cyan-800 dark:text-cyan-300",
  Quote:
    "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-300",
  Closed:
    "bg-slate-100 border-slate-300 text-slate-600 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-400",
  Rejected:
    "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/50 dark:border-red-800 dark:text-red-300",
  Voided:
    "bg-slate-100 border-slate-400 text-slate-500 dark:bg-slate-800 dark:border-slate-500 dark:text-slate-500",
};

export default function WorkOrdersPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth({ redirectToSignIn: true });
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [branchDeptFilter, setBranchDeptFilter] = useBranchDeptFilter();

  useEffect(() => {
    if (!token) return;
    getViewedWOs(10)
      .then((data) => {
        const withText = data.map((item) => ({
          ...item,
          DispositionText: getDisplayStatus(item),
        }));
        setRecentOrders(withText);
      })
      .catch(() => setRecentOrders([]))
      .finally(() => setRecentLoading(false));
  }, [token]);

  if (authLoading || !token) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-full bg-gradient-to-b from-slate-50 to-cyan-50/30 dark:from-slate-950 dark:to-slate-900"
      initial={fadeIn.initial}
      animate={fadeIn.animate}
      transition={fadeIn.transition}
    >
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          className="mb-10"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={fadeInUp.transition}
        >
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
            Work Orders
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Search, create, and view work orders, quotes and rentals.
          </p>
        </motion.div>

        {/* Action Cards */}
        <motion.div
          className="mb-12"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {ACTION_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <motion.div key={card.title} variants={staggerItem}>
                  <Link href={card.href} className="block">
                    <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-200/80 bg-white shadow-sm transition-all hover:border-cyan-200 hover:shadow-lg hover:shadow-cyan-500/5 dark:border-slate-700/50 dark:bg-slate-800/50 dark:hover:border-cyan-500/50 h-full">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-900/30">
                        <Icon className="h-6 w-6 text-cyan-600 dark:text-cyan-400" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                          {card.title}
                        </h3>
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[2.5rem]">
                          {card.text}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 dark:text-slate-500" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Search Section */}
        <motion.section
          id="search"
          className="mb-12"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={{ ...fadeInUp.transition, delay: 0.15 }}
        >
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Search Work Orders
              </h2>
              {token && (
                <button
                  type="button"
                  onClick={() => setAdvancedOpen((o) => !o)}
                  className="text-sm text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-400 transition-colors"
                >
                  {advancedOpen ? "Hide advanced" : "Advanced search"}
                </button>
              )}
            </div>
            <WorkOrderSearchCombobox />
            {token && advancedOpen && (
              <AdvancedSearchSection
                token={token}
                branchDeptFilter={branchDeptFilter}
                setBranchDeptFilter={setBranchDeptFilter}
                router={router}
              />
            )}
          </div>
        </motion.section>

        {/* Recent Viewed */}
        <section>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
            Recently Viewed
          </h2>
          {recentLoading ? (
            <motion.div
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  variants={staggerItem}
                  className="h-32 rounded-xl border border-slate-200/80 bg-white dark:border-slate-700/50 dark:bg-slate-800/50 animate-pulse"
                />
              ))}
            </motion.div>
          ) : recentOrders.length === 0 ? (
            <motion.p
              className="text-slate-500 dark:text-slate-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              No recently viewed work orders.
            </motion.p>
          ) : (
            <motion.div
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
            >
              {recentOrders.map((wo) => (
                <WOCard
                  key={wo.WONo}
                  wo={wo}
                  onClick={() => router.push(`/work-orders/${wo.WONo}`)}
                />
              ))}
            </motion.div>
          )}
        </section>
      </div>
    </motion.div>
  );
}

function AdvancedSearchSection({ token, branchDeptFilter, setBranchDeptFilter, router }) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [form, setForm] = useState({
    type: "order",
    includeClosedQuotes: false,
    shipTo: null,
    billTo: null,
    SerialNo: "",
    GMSerialNo: "",
    UnitNo: "",
    PONo: "",
  });

  const resetForm = () => {
    setForm({
      type: "order",
      includeClosedQuotes: false,
      shipTo: null,
      billTo: null,
      SerialNo: "",
      GMSerialNo: "",
      UnitNo: "",
      PONo: "",
    });
    setResults(null);
  };

  const handleSearch = async () => {
    setLoading(true);
    setResults(null);
    try {
      const payload = {
        type: form.type,
        includeClosedQuotes: form.type === "quote" ? form.includeClosedQuotes : undefined,
        branches: branchDeptFilter?.branches?.length ? branchDeptFilter.branches : undefined,
        depts: branchDeptFilter?.depts?.length ? branchDeptFilter.depts : undefined,
        ShipTo: form.shipTo?.Number ?? form.shipTo?.number ?? form.shipTo,
        BillTo: form.billTo?.Number ?? form.billTo?.number ?? form.billTo,
        SerialNo: form.SerialNo.trim() || undefined,
        GMSerialNo: form.GMSerialNo.trim() || undefined,
        UnitNo: form.UnitNo.trim() || undefined,
        PONo: form.PONo.trim() || undefined,
      };
      const data = await searchWOsAdvanced(payload);
      const withText = data.map((item) => ({
        ...item,
        DispositionText: getDisplayStatus(item),
      }));
      setResults(withText);
      toast.success(`Found ${withText.length} work orders`);
    } catch (err) {
      toast.error(err?.message || "Advanced search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            {token && (
              <BranchDeptFilter
                value={branchDeptFilter}
                onChange={setBranchDeptFilter}
                token={token}
              />
            )}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="searchType"
                  checked={form.type === "order"}
                  onChange={() => setForm((f) => ({ ...f, type: "order" }))}
                  className="rounded border-input"
                />
                Orders
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="searchType"
                  checked={form.type === "quote"}
                  onChange={() => setForm((f) => ({ ...f, type: "quote" }))}
                  className="rounded border-input"
                />
                Quotes
              </label>
            </div>
            {form.type === "quote" && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.includeClosedQuotes}
                  onChange={(e) => setForm((f) => ({ ...f, includeClosedQuotes: e.target.checked }))}
                  className="rounded border-input"
                />
                Include closed quotes
              </label>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm">Ship To</Label>
              <div className="mt-1">
                <CustomerCombobox
                  value={form.shipTo}
                  onValueChange={(v) => setForm((f) => ({ ...f, shipTo: v }))}
                  token={token}
                  placeholder="Search customers..."
                />
              </div>
            </div>
            <div>
              <Label className="text-sm">Bill To</Label>
              <div className="mt-1">
                <CustomerCombobox
                  value={form.billTo}
                  onValueChange={(v) => setForm((f) => ({ ...f, billTo: v }))}
                  token={token}
                  placeholder="Search customers..."
                />
              </div>
            </div>
            <div>
              <Label className="text-sm">Serial #</Label>
              <Input
                value={form.SerialNo}
                onChange={(e) => setForm((f) => ({ ...f, SerialNo: e.target.value }))}
                placeholder="Serial #"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">GM Serial #</Label>
              <Input
                value={form.GMSerialNo}
                onChange={(e) => setForm((f) => ({ ...f, GMSerialNo: e.target.value }))}
                placeholder="GM Serial #"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Unit #</Label>
              <Input
                value={form.UnitNo}
                onChange={(e) => setForm((f) => ({ ...f, UnitNo: e.target.value }))}
                placeholder="Unit #"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">PO #</Label>
              <Input
                value={form.PONo}
                onChange={(e) => setForm((f) => ({ ...f, PONo: e.target.value }))}
                placeholder="PO #"
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSearch} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </Button>
            <Button variant="outline" onClick={resetForm} disabled={loading}>
              Reset
            </Button>
          </div>
          {results !== null && (
            <div className="rounded-lg border dark:border-slate-700 overflow-hidden">
              <h3 className="text-sm font-medium px-4 py-2 bg-muted/50 dark:bg-slate-800">
                Results ({results.length})
              </h3>
              {results.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground">No work orders found.</p>
              ) : (
                <div className="max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Order #</TableHead>
                        <TableHead>Ship To</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>PO #</TableHead>
                        <TableHead>Serial #</TableHead>
                        <TableHead>Unit #</TableHead>
                        <TableHead>Make</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Salesman</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((r) => (
                        <TableRow
                          key={r.WONo}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/work-orders/${r.WONo}`)}
                        >
                          <TableCell className="font-medium text-cyan-600 dark:text-cyan-400">
                            {r.WONo}
                          </TableCell>
                          <TableCell>{r.ShipTo ?? "—"}</TableCell>
                          <TableCell>{r.ShipName ?? "—"}</TableCell>
                          <TableCell>{r.PONo ?? "—"}</TableCell>
                          <TableCell>{r.SerialNo ?? "—"}</TableCell>
                          <TableCell>{r.UnitNo ?? "—"}</TableCell>
                          <TableCell>{r.Make ?? "—"}</TableCell>
                          <TableCell>{r.Model ?? "—"}</TableCell>
                          <TableCell>{r.Salesman ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
    </div>
  );
}

function WOCard({ wo, onClick }) {
  const statusStyle = statusStyles[wo.DispositionText] ?? statusStyles.Closed;
  const equipmentText =
    wo.Make && wo.Model && wo.SerialNo
      ? [wo.Make, wo.Model, wo.SerialNo].filter(Boolean).join(", ")
      : "No equipment";
  const locationName = wo.Name || wo.ShipName;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:border-cyan-200 hover:shadow-lg hover:shadow-cyan-500/5 dark:border-slate-700/50 dark:bg-slate-800/50 dark:hover:border-cyan-500/50"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-lg font-semibold text-slate-900 dark:text-white">#{wo.WONo}</span>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyle}`}
        >
          {wo.DispositionText || "N/A"}
        </span>
      </div>
      <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
        {locationName && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.5} />
            <span className="truncate">{locationName}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.5} />
          <span className="truncate">{equipmentText}</span>
        </div>
      </div>
    </button>
  );
}
