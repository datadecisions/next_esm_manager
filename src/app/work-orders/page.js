"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { getAuthToken } from "@/lib/auth";
import { getViewedWOs, getDispositionText } from "@/lib/api/work-order";
import { WorkOrderSearchCombobox } from "@/components/WorkOrderSearchCombobox";

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
    title: "Search",
    text: "Search work orders by number, customer, or equipment.",
    href: "#search",
    icon: Search,
    permissions: ["InvoiceOpen"],
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
};

export default function WorkOrdersPage() {
  const router = useRouter();
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push("/sign-in");
      return;
    }
    getViewedWOs(10, token)
      .then((data) => {
        const withText = data.map((item) => ({
          ...item,
          DispositionText: getDispositionText(item.Disposition),
        }));
        setRecentOrders(withText);
      })
      .catch(() => setRecentOrders([]))
      .finally(() => setRecentLoading(false));
  }, [router]);

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 to-cyan-50/30 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
            Work Orders
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Search, create, and view work orders, quotes and rentals.
          </p>
        </div>

        {/* Action Cards */}
        <div className="mb-12">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {ACTION_CARDS.map((card) => {
              const Icon = card.icon;
              const isSearchAnchor = card.href === "#search";
              const content = (
                <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-200/80 bg-white shadow-sm transition-all hover:border-cyan-200 hover:shadow-lg hover:shadow-cyan-500/5 dark:border-slate-700/50 dark:bg-slate-800/50 dark:hover:border-cyan-500/50 h-full">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-900/30">
                    <Icon className="h-6 w-6 text-cyan-600 dark:text-cyan-400" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                      {card.title}
                    </h3>
                    <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                      {card.text}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 dark:text-slate-500" />
                </div>
              );
              return isSearchAnchor ? (
                <a key={card.title} href="#search" className="block">
                  {content}
                </a>
              ) : (
                <Link key={card.title} href={card.href}>
                  {content}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Search Section */}
        <section id="search" className="mb-12">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              Search Work Orders
            </h2>
            <WorkOrderSearchCombobox />
          </div>
        </section>

        {/* Recent Viewed */}
        <section>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
            Recently Viewed
          </h2>
          {recentLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-32 rounded-xl border border-slate-200/80 bg-white dark:border-slate-700/50 dark:bg-slate-800/50 animate-pulse"
                />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400">
              No recently viewed work orders.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {recentOrders.map((wo) => (
                <WOCard
                  key={wo.WONo}
                  wo={wo}
                  onClick={() => router.push(`/work-orders/${wo.WONo}`)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
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
