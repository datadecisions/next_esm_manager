"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { BackOrderedPartsTable } from "@/components/purchase-order/BackOrderedPartsTable";
import { RequisitionsTable } from "@/components/parts/RequisitionsTable";
import { StalePartsTable } from "@/components/parts/StalePartsTable";
import { ConsignmentsTable } from "@/components/parts/ConsignmentsTable";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fadeIn, fadeInUp } from "@/lib/motion";

export default function PartsInventoryTablesPage() {
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
          className="mb-8 flex items-center gap-4"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={fadeInUp.transition}
        >
          <Button variant="ghost" size="icon" asChild>
            <Link href="/parts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
              Inventory Tables
            </h1>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              Backorders, requisitions, stale parts, and consignments.
            </p>
          </div>
        </motion.div>

        <motion.div
          className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={{ ...fadeInUp.transition, delay: 0.05 }}
        >
          <Tabs defaultValue="backorders" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
              <TabsTrigger value="backorders">Backorders</TabsTrigger>
              <TabsTrigger value="requisitions">Requisitions</TabsTrigger>
              <TabsTrigger value="stale">Stale Parts</TabsTrigger>
              <TabsTrigger value="consignments">Consignments</TabsTrigger>
            </TabsList>

            <TabsContent value="backorders">
              <BackOrderedPartsTable token={token} />
            </TabsContent>

            <TabsContent value="requisitions">
              <RequisitionsTable token={token} />
            </TabsContent>

            <TabsContent value="stale">
              <StalePartsTable token={token} />
            </TabsContent>

            <TabsContent value="consignments">
              <ConsignmentsTable token={token} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </motion.div>
  );
}
