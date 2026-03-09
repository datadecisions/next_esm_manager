"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Clock,
  CheckCircle,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { fadeIn, fadeInUp, staggerContainer, staggerItem } from "@/lib/motion";

const ACTION_CARDS = [
  {
    title: "Approval",
    text: "Approve pending labor entries for work orders.",
    href: "/labor/approval",
    icon: CheckCircle,
  },
  {
    title: "Timecards",
    text: "View signed timecard PDFs grouped by technician.",
    href: "/labor/timecards",
    icon: Clock,
  },
  {
    title: "KPI Dashboard",
    text: "Key metrics: pending approval, utilization, open orders aging.",
    href: "/labor/kpi",
    icon: BarChart3,
  },
];

export default function LaborPage() {
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
            <Clock className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
              Labor Manager
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400">
            Approve labor entries and manage timecards.
          </p>
        </motion.div>

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
                    <div className="flex gap-4 p-4 rounded-xl border border-slate-200/80 bg-white shadow-sm transition-all hover:border-cyan-200 hover:shadow-lg hover:shadow-cyan-500/5 dark:border-slate-700/50 dark:bg-slate-800/50 dark:hover:border-cyan-500/50 h-full">
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
