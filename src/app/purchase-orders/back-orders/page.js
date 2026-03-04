"use client";

import { motion } from "framer-motion";
import { Package } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { BackOrderedPartsTable } from "@/components/purchase-order/BackOrderedPartsTable";
import { fadeIn, fadeInUp } from "@/lib/motion";

export default function BackOrderedPartsPage() {
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
          className="mb-8"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={fadeInUp.transition}
        >
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
            Back Ordered Part Requests
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Select any number of requested parts to add to a new purchase order.
          </p>
        </motion.div>

        <motion.div
          className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={{ ...fadeInUp.transition, delay: 0.05 }}
        >
          <BackOrderedPartsTable token={token} />
        </motion.div>
      </div>
    </motion.div>
  );
}
