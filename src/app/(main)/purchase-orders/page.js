"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Plus,
  Package,
  ChevronRight,
  ClipboardList,
  ShoppingCart,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { PurchaseOrderSearchCombobox } from "@/components/PurchaseOrderSearchCombobox";
import { Button } from "@/components/ui/button";
import { fadeIn, fadeInUp, staggerContainer, staggerItem } from "@/lib/motion";

const ACTION_CARDS = [
  {
    title: "Open Purchase Orders",
    text: "View and manage open purchase orders by branch.",
    href: "/purchase-orders/open",
    icon: ClipboardList,
  },
  {
    title: "Back Ordered Part Requests",
    text: "Select parts from work orders to add to a new PO.",
    href: "/purchase-orders/back-orders",
    icon: Package,
  },
  {
    title: "Restock",
    text: "Parts to order by branch (inventory replenishment).",
    href: "/purchase-orders/restock",
    icon: ShoppingCart,
  },
];

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth({ redirectToSignIn: true });

  const handleSelectPo = (po) => {
    if (po?.PONo) {
      router.push(`/purchase-orders/${po.PONo}`);
    }
  };

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
          className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={fadeInUp.transition}
        >
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
              Purchase Orders
            </h1>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              Create and manage purchase orders for parts, equipment, and misc items.
            </p>
          </div>
          <Button asChild className="gap-2 shrink-0">
            <Link href="/purchase-orders/new">
              <Plus className="h-4 w-4" />
              New Purchase Order
            </Link>
          </Button>
        </motion.div>

        {/* Quick search */}
        <motion.section
          className="mb-12"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={{ ...fadeInUp.transition, delay: 0.05 }}
        >
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              Search Purchase Orders
            </h2>
            <PurchaseOrderSearchCombobox
              token={token}
              onSelect={handleSelectPo}
              placeholder="Search by PO #, vendor name..."
            />
          </div>
        </motion.section>

        {/* Action Cards */}
        <motion.div
          className="mb-12"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
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
      </div>
    </motion.div>
  );
}
