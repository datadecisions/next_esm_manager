"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getPart } from "@/lib/api/parts";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fadeIn, fadeInUp } from "@/lib/motion";

function formatCurrency(n) {
  if (n == null || n === "") return "—";
  const num = parseFloat(n);
  return isNaN(num)
    ? "—"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}

export default function PartDetailPage() {
  const params = useParams();
  const partNo = params?.partNo ? decodeURIComponent(params.partNo) : null;
  const warehouse = params?.warehouse ? decodeURIComponent(params.warehouse) : null;
  const { token, isLoading: authLoading } = useAuth({ redirectToSignIn: true });
  const [part, setPart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token || !partNo || !warehouse) {
      setLoading(false);
      return;
    }
    getPart(partNo, warehouse, token)
      .then(setPart)
      .catch((err) => setError(err?.message || "Failed to load part"))
      .finally(() => setLoading(false));
  }, [token, partNo, warehouse]);

  if (authLoading || !token) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  if (!partNo || !warehouse) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-muted-foreground">Invalid part or warehouse.</p>
        <Button asChild variant="link" className="mt-4">
          <Link href="/parts">Back to Parts</Link>
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (error || !part) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-destructive">{error || "Part not found."}</p>
        <Button asChild variant="link" className="mt-4">
          <Link href="/parts">Back to Parts</Link>
        </Button>
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
              {part.PartNo}
            </h1>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              {part.Warehouse ?? warehouse} · {part.Description ?? "—"}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={{ ...fadeInUp.transition, delay: 0.05 }}
        >
          <Tabs defaultValue="general" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="bin">Bins</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="extras">Extras</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>General Information</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Part No</p>
                    <p className="font-medium">{part.PartNo}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Warehouse</p>
                    <p className="font-medium">{part.Warehouse ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="font-medium">{part.Description ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Bin</p>
                    <p className="font-medium">{part.Bin ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">On Hand</p>
                    <p className="font-medium">{part.OnHand ?? part.Qty ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Cost</p>
                    <p className="font-medium">{formatCurrency(part.AvgCost ?? part.AvgUnitCost)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Parts Group</p>
                    <p className="font-medium">{part.PartsGroup ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vendor</p>
                    <p className="font-medium">{part.Vendor ?? "—"}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bin">
              <Card>
                <CardHeader>
                  <CardTitle>Bin Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Bin history and same-bin parts. Full implementation coming soon.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Sale History</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Part sale history. Full implementation coming soon.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pricing">
              <Card>
                <CardHeader>
                  <CardTitle>Pricing & Quantities</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Cost</p>
                    <p className="font-medium">{formatCurrency(part.AvgCost ?? part.AvgUnitCost)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cost</p>
                    <p className="font-medium">{formatCurrency(part.Cost)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sell</p>
                    <p className="font-medium">{formatCurrency(part.Sell ?? part.AvgUnitSell)}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="extras">
              <Card>
                <CardHeader>
                  <CardTitle>More Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Comments, alias, and additional info. Full implementation coming soon.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </motion.div>
  );
}
