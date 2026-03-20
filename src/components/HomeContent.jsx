"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Calculator,
  Pencil,
  Paperclip,
  Wrench,
  Clock,
  BarChart3,
  BookOpen,
  DollarSign,
  FileText,
  List,
  MapPin,
  History,
  Banknote,
  ClipboardList,
  CheckCircle,
  Table2,
  ArrowRightLeft,
  Truck,
  Layers,
  Warehouse,
  Upload,
  Scan,
  Plus,
  ShoppingCart,
  RefreshCw,
  CreditCard,
} from "lucide-react";
import { fadeInUp, staggerContainer, staggerItem } from "@/lib/motion";

const primaryCards = [
  {
    title: "Accounting",
    text: "View accounting summary graphs, AR and AP data.",
    href: "/accounting",
    icon: Calculator,
  },
  {
    title: "Parts",
    text: "View, edit, and approve individual parts and orders.",
    href: "/parts",
    icon: Wrench,
  },
  {
    title: "Purchase Orders",
    text: "Create and maintain purchase orders.",
    href: "/purchase-orders",
    icon: Paperclip,
  },
  {
    title: "Work Orders",
    text: "View, edit, and create individual work orders.",
    href: "/work-orders",
    icon: Pencil,
  },
  {
    title: "Labor",
    text: "Approve labor entries and manage timecards.",
    href: "/labor",
    icon: Clock,
  },
];

const submodules = [
  // Accounting
  { title: "Summary Charts", text: "View your summary charts.", href: "/accounting/dashboard", icon: BarChart3, parent: "Accounting" },
  { title: "Chart of Accounts", text: "Structured list of accounts.", href: "/accounting/chart", icon: BookOpen, parent: "Accounting" },
  { title: "Budget", text: "Track department financial performance.", href: "/accounting/budget", icon: Pencil, parent: "Accounting" },
  { title: "Reports", text: "Balance Sheet and Cash Flow reports.", href: "/accounting/reports", icon: DollarSign, parent: "Accounting" },
  { title: "Manual Journal", text: "Record adjustments in the general ledger.", href: "/accounting/journal", icon: FileText, parent: "Accounting" },
  { title: "Equipment Ledger", text: "View GL entries for equipment.", href: "/accounting/equipment", icon: List, parent: "Accounting" },
  { title: "Customer AR", text: "View open invoices and AR activity.", href: "/accounting/customer", icon: MapPin, parent: "Accounting" },
  { title: "AR History", text: "Search AR records.", href: "/accounting/ar-history", icon: History, parent: "Accounting" },
  { title: "Bank Reconciliation", text: "Reconcile bank statements.", href: "/accounting/reconciliation", icon: Banknote, parent: "Accounting" },
  { title: "WIP & Daily Reports", text: "WIP summary and daily sales reports.", href: "/accounting/operations-reports", icon: ClipboardList, parent: "Accounting" },
  // Parts
  { title: "KPI Dashboard", text: "Charts, fill rate, inventory turns.", href: "/parts/kpi", icon: BarChart3, parent: "Parts" },
  { title: "Approval", text: "Approve work order parts requests.", href: "/parts/approval", icon: CheckCircle, parent: "Parts" },
  { title: "Inventory Tables", text: "Backorders, requisitions, stale parts.", href: "/parts/inventory/tables", icon: Table2, parent: "Parts" },
  { title: "Transfer", text: "Move parts between warehouses.", href: "/parts/transfer", icon: ArrowRightLeft, parent: "Parts" },
  { title: "Receive", text: "Receive parts from purchase orders.", href: "/parts/receive", icon: Truck, parent: "Parts" },
  { title: "Count", text: "Inventory count.", href: "/parts/count", icon: ClipboardList, parent: "Parts" },
  { title: "Assembly", text: "Create and manage parts assemblies (BOM).", href: "/parts/assembly", icon: Layers, parent: "Parts" },
  { title: "Warehouse", text: "Search parts by warehouse.", href: "/parts/warehouse", icon: Warehouse, parent: "Parts" },
  { title: "Upload Prices", text: "Price files from manufacturers.", href: "/parts/upload", icon: Upload, parent: "Parts" },
  { title: "Scan", text: "Find parts by barcode.", href: "/parts/scan", icon: Scan, parent: "Parts" },
  // Purchase Orders
  { title: "Open Purchase Orders", text: "View and manage open POs by branch.", href: "/purchase-orders/open", icon: ClipboardList, parent: "Purchase Orders" },
  { title: "Back Ordered Part Requests", text: "Add work order parts to a new PO.", href: "/purchase-orders/back-orders", icon: Paperclip, parent: "Purchase Orders" },
  { title: "Restock", text: "Parts to order by branch.", href: "/purchase-orders/restock", icon: ShoppingCart, parent: "Purchase Orders" },
  // Work Orders
  { title: "Create Work Order", text: "Create a new work order.", href: "/work-orders/create", icon: Plus, parent: "Work Orders" },
  { title: "Recurring Orders", text: "Close and open new recurring orders.", href: "/work-orders/recurring", icon: RefreshCw, parent: "Work Orders" },
  { title: "Close / Distribute Orders", text: "Centralized closing and distribution.", href: "/work-orders/distribute", icon: Paperclip, parent: "Work Orders" },
  { title: "Credit Approval", text: "Approve pending credit items.", href: "/work-orders/credit", icon: CreditCard, parent: "Work Orders" },
  { title: "Workflow", text: "Approve work items for customer.", href: "/work-orders/workflow", icon: Pencil, parent: "Work Orders" },
  { title: "Reports Dashboard", text: "Interactive Reports.", href: "/work-orders/reports", icon: BarChart3, parent: "Work Orders" },
  // Labor
  { title: "Approval", text: "Approve pending labor entries.", href: "/labor/approval", icon: CheckCircle, parent: "Labor" },
  { title: "Timecards", text: "View signed timecard PDFs.", href: "/labor/timecards", icon: Clock, parent: "Labor" },
  { title: "KPI Dashboard", text: "Pending approval, utilization, aging.", href: "/labor/kpi", icon: BarChart3, parent: "Labor" },
];

function matchesQuery(item, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const searchText = `${item.title} ${item.text} ${item.parent || ""}`.toLowerCase();
  return searchText.includes(q);
}

function primaryCardMatches(card, query, submodulesList) {
  if (matchesQuery(card, query)) return true;
  const hasMatchingSubmodule = submodulesList.some(
    (s) => s.parent === card.title && matchesQuery(s, query)
  );
  return hasMatchingSubmodule;
}

function PrimaryCard({ title, text, href, icon: Icon }) {
  return (
    <Link
      href={href}
      className="group flex min-h-[180px] flex-col rounded-2xl border border-border/80 bg-card p-8 shadow-sm transition-all hover:border-cyan-200 hover:shadow-lg hover:shadow-cyan-500/5 active:scale-[0.99] sm:min-h-[220px]"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-linear-to-br from-accent/20 to-primary/10 transition-colors group-hover:from-accent/30 group-hover:to-primary/15">
        <Icon className="h-7 w-7 text-foreground/80" strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-semibold text-foreground sm:text-2xl">{title}</h3>
      <p className="mt-2 flex-1 text-muted-foreground sm:text-base">{text}</p>
      <span className="mt-4 inline-flex items-center text-sm font-medium text-primary group-hover:text-primary/90">
        Open
        <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
      </span>
    </Link>
  );
}

function SubmoduleCard({ title, text, href, icon: Icon, parent }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-border/80 bg-card p-4 shadow-sm transition-all hover:border-cyan-200 hover:shadow-md hover:shadow-cyan-500/5"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/15">
        <Icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-foreground truncate">{title}</h3>
        <p className="text-sm text-muted-foreground truncate">{parent} · {text}</p>
      </div>
      <span className="shrink-0 text-sm font-medium text-primary group-hover:text-primary/90">→</span>
    </Link>
  );
}

export function HomeContent({ userName }) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPrimary = useMemo(
    () => primaryCards.filter((card) => primaryCardMatches(card, searchQuery, submodules)),
    [searchQuery]
  );

  const filteredSubmodules = useMemo(
    () => submodules.filter((item) => matchesQuery(item, searchQuery)),
    [searchQuery]
  );

  const hasQuery = searchQuery.trim().length > 0;
  const showPrimary = hasQuery ? filteredPrimary : primaryCards;
  const showSubmodules = hasQuery ? filteredSubmodules : [];
  const hasResults = showPrimary.length > 0 || showSubmodules.length > 0;

  return (
    <div className="min-h-full bg-linear-to-b from-background via-accent/10 to-background text-foreground">
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={fadeInUp.transition}
        >
          <div>
            <h2 className="text-2xl font-light text-muted-foreground sm:text-3xl">
              Welcome back,
            </h2>
            <h3 className="mt-1 text-3xl font-semibold text-foreground sm:text-4xl">
              {userName}
            </h3>
          </div>
          <div className="w-full max-w-sm">
            <input
              type="search"
              placeholder="Search modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onBlur={(e) => {
                if (e.target.value === "" && searchQuery !== "") {
                  setSearchQuery("");
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setSearchQuery("");
                  e.target.blur();
                }
              }}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              aria-label="Search modules"
            />
          </div>
        </motion.div>

        {hasResults ? (
          <div key={hasQuery ? "filtered" : "all"}>
            {showPrimary.length > 0 && (
              <motion.div
                className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {showPrimary.map((card) => (
                  <motion.div key={card.title} variants={staggerItem}>
                    <PrimaryCard title={card.title} text={card.text} href={card.href} icon={card.icon} />
                  </motion.div>
                ))}
              </motion.div>
            )}

            {showSubmodules.length > 0 && (
              <motion.div
                className={hasQuery ? "mt-10" : ""}
                initial={fadeInUp.initial}
                animate={fadeInUp.animate}
                transition={fadeInUp.transition}
              >
                {hasQuery && (
                  <h2 className="mb-4 text-lg font-semibold text-foreground">
                    Submodules
                  </h2>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {showSubmodules.map((item) => (
                    <SubmoduleCard
                      key={`${item.parent}-${item.title}`}
                      title={item.title}
                      text={item.text}
                      href={item.href}
                      icon={item.icon}
                      parent={item.parent}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        ) : (
          <motion.p
            className="rounded-xl border border-border/80 bg-card px-6 py-8 text-center text-muted-foreground"
            initial={fadeInUp.initial}
            animate={fadeInUp.animate}
          >
            No modules match &quot;{searchQuery}&quot;. Try searching by name or description.
          </motion.p>
        )}
      </div>
    </div>
  );
}
