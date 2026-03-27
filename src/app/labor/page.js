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
            <Clock className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">
              Labor Manager
            </h1>
          </div>
          <p className="text-muted-foreground">
            Approve labor entries and manage timecards.
          </p>
        </motion.div>

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
                    <div className="flex h-full gap-4 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm transition-all hover:border-primary/40 hover:shadow-lg">
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
