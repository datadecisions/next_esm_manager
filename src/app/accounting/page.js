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
  Banknote,
  ClipboardList,
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
    text: "View GL entries for equipment by serial, unit, make, or model.",
    href: "/accounting/equipment",
    icon: List,
  },
  {
    title: "Customer AR",
    text: "View open invoices and AR activity (invoices, payments) for a customer.",
    href: "/accounting/customer",
    icon: MapPin,
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
    comingSoon: true,
  },
  {
    title: "WIP & Daily Reports",
    text: "WIP summary and daily sales reports.",
    href: "/accounting/operations-reports",
    icon: ClipboardList,
  },
];

export default function AccountingPage() {
  const { token, isLoading: authLoading } = useAuth({ redirectToSignIn: true });

  if (authLoading || !token) {
    return (
      <div className="flex min-h-[200px] items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-full text-foreground"
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
            <Calculator className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">
              Accounting
            </h1>
          </div>
          <p className="text-muted-foreground">
            View accounting summary graphs. AR and AP data.
          </p>
        </motion.div>

        {/* Action Cards */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {ACTION_CARDS.map((card) => {
              const Icon = card.icon;
              const isComingSoon = card.comingSoon;
              return (
                <motion.div key={card.title} variants={staggerItem}>
                  {isComingSoon ? (
                    <div className="relative flex items-center gap-4 p-4 rounded-xl border border-border/80 bg-muted/20 h-full opacity-75 cursor-not-allowed">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/15">
                        <Icon
                          className="h-6 w-6 text-muted-foreground"
                          strokeWidth={1.5}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-muted-foreground truncate">
                          {card.title}
                        </h3>
                        <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2 min-h-10">
                          {card.text}
                        </p>
                      </div>
                      <span className="absolute top-3 right-3 rounded-full bg-accent/30 px-2.5 py-0.5 text-xs font-medium text-foreground">
                        Coming soon
                      </span>
                    </div>
                  ) : (
                    <Link href={card.href} className="block">
                      <div className="flex items-center gap-4 p-4 rounded-xl border border-border/80 bg-card shadow-sm transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 h-full">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/15">
                          <Icon
                            className="h-6 w-6 text-primary"
                            strokeWidth={1.5}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">
                            {card.title}
                          </h3>
                          <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2 min-h-10">
                            {card.text}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                      </div>
                    </Link>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
