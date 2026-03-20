"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Wrench,
  BarChart3,
  CheckCircle,
  Table2,
  ArrowRightLeft,
  Truck,
  ClipboardList,
  Layers,
  Upload,
  Scan,
  Warehouse,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { PartsSearchCombobox } from "@/components/PartsSearchCombobox";
import { fadeIn, fadeInUp, staggerContainer, staggerItem } from "@/lib/motion";

const ACTION_CARDS = [
  {
    title: "KPI Dashboard",
    text: "Charts, fill rate, inventory turns, and reports.",
    href: "/parts/kpi",
    icon: BarChart3,
  },
  {
    title: "Approval",
    text: "Approve work order parts requests.",
    href: "/parts/approval",
    icon: CheckCircle,
  },
  {
    title: "Inventory Tables",
    text: "Backorders, requisitions, stale parts, consignments.",
    href: "/parts/inventory/tables",
    icon: Table2,
  },
  {
    title: "Transfer",
    text: "Move parts between warehouses.",
    href: "/parts/transfer",
    icon: ArrowRightLeft,
  },
  {
    title: "Receive",
    text: "Receive parts from purchase orders.",
    href: "/parts/receive",
    icon: Truck,
  },
  {
    title: "Count",
    text: "Inventory count.",
    href: "/parts/count",
    icon: ClipboardList,
  },
  {
    title: "Assembly",
    text: "Create and manage parts assemblies (BOM).",
    href: "/parts/assembly",
    icon: Layers,
  },
  // {
  //   title: "Avg Cost",
  //   text: "Adjust average cost for parts.",
  //   href: "/parts/avg-cost",
  //   icon: DollarSign,
  // },
  {
    title: "Warehouse",
    text: "Search parts by warehouse.",
    href: "/parts/warehouse",
    icon: Warehouse,
  },
  {
    title: "Upload Prices",
    text: "Price files from manufacturers.",
    href: "/parts/upload",
    icon: Upload,
  },
  {
    title: "Scan",
    text: "Find parts by barcode.",
    href: "/parts/scan",
    icon: Scan,
  },
];

export default function PartsPage() {
  const { token, isLoading: authLoading } = useAuth({ redirectToSignIn: true });

  if (authLoading || !token) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-full bg-background text-foreground"
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
            <Wrench className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">
              Parts Manager
            </h1>
          </div>
          <p className="text-muted-foreground">
            Search for parts, manage inventory, and approve work order parts.
          </p>
        </motion.div>

        {/* Search */}
        <motion.section
          className="mb-12"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={{ ...fadeInUp.transition, delay: 0.05 }}
        >
          <div className="rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              Search Parts
            </h2>
            <PartsSearchCombobox
              token={token}
              placeholder="Search by part #, description, vendor..."
              minChars={3}
            />
          </div>
        </motion.section>

        {/* Action Cards */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {ACTION_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <motion.div key={card.title} variants={staggerItem}>
                  <Link href={card.href} className="block">
                    <div className="flex h-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm transition-all hover:border-primary/40 hover:shadow-lg">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                        <Icon
                          className="h-6 w-6 text-primary"
                          strokeWidth={1.5}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="truncate font-semibold text-foreground">
                          {card.title}
                        </h3>
                        <p className="mt-0.5 min-h-[2.5rem] line-clamp-2 text-sm text-muted-foreground">
                          {card.text}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
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
