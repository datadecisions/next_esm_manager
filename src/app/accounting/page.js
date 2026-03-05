"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Calculator,
  BarChart3,
  BookOpen,
  Pencil,
  DollarSign,
  FileText,
  List,
  MapPin,
  Inbox,
  Banknote,
  Settings,
  Calendar,
  History,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { fadeIn, fadeInUp, staggerContainer, staggerItem } from "@/lib/motion";

const ACTION_CARDS = [
  {
    title: "Summary Charts",
    text: "View your summary charts to get an overview of accounting.",
    href: "/accounting/dashboard",
    icon: BarChart3,
  },
  {
    title: "Chart of Accounts",
    text: "Structured list of accounts to organize financial information.",
    href: "/accounting/chart",
    icon: BookOpen,
  },
  {
    title: "Budget",
    text: "Track department financial performance and set budget.",
    href: "/accounting/budget",
    icon: Pencil,
  },
  {
    title: "Reports",
    text: "Run a Balance Sheet report as well as a Cash Flow report.",
    href: "/accounting/reports",
    icon: DollarSign,
  },
  {
    title: "Manual Journal",
    text: "Manually record adjustments, corrections, and non-routine transactions in the general ledger.",
    href: "/accounting/journal",
    icon: FileText,
  },
  {
    title: "Equipment Ledger",
    text: "Track and manage detailed information about equipment inventory.",
    href: "/accounting/equipment",
    icon: List,
  },
  {
    title: "Customer Invoices",
    text: "Search for customers' specific invoices.",
    href: "/accounting/customer?searchType=invoice",
    icon: MapPin,
  },
  {
    title: "Customer Ledger",
    text: "Maintain detailed records of customer transactions and manage customer accounts.",
    href: "/accounting/customer?searchType=ledger",
    icon: Inbox,
  },
  {
    title: "AR History",
    text: "Search AR records.",
    href: "/accounting/ar-history",
    icon: History,
  },
  {
    title: "Bank Reconciliation",
    text: "Reconcile bank statements with general ledger.",
    href: "/accounting/reconciliation",
    icon: Banknote,
  },
  {
    title: "WIP Report",
    text: "Current work in progress.",
    href: "/accounting/aging-summary",
    icon: Settings,
  },
  {
    title: "Daily Sales",
    text: "Daily sales report.",
    href: "/accounting/daily",
    icon: Calendar,
  },
];

export default function AccountingPage() {
  const { token, isLoading: authLoading } = useAuth({ redirectToSignIn: true });

  if (authLoading || !token) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
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
          <div className="flex items-center gap-3 mb-2">
            <Calculator className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
              Accounting
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400">
            View accounting summary graphs. AR and AP data.
          </p>
        </motion.div>

        {/* Action Cards */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {ACTION_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <motion.div key={card.title} variants={staggerItem}>
                  <Link href={card.href} className="block">
                    <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-200/80 bg-white shadow-sm transition-all hover:border-cyan-200 hover:shadow-lg hover:shadow-cyan-500/5 dark:border-slate-700/50 dark:bg-slate-800/50 dark:hover:border-cyan-500/50 h-full">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-900/30">
                        <Icon
                          className="h-6 w-6 text-cyan-600 dark:text-cyan-400"
                          strokeWidth={1.5}
                        />
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
      </div>
    </motion.div>
  );
}
