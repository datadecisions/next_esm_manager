"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Layers, Plus, Loader2, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getAssemblies } from "@/lib/api/parts";
import { CreateAssemblyDialog } from "@/components/parts/CreateAssemblyDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fadeIn, fadeInUp } from "@/lib/motion";

function formatCurrency(n) {
  if (n == null || n === "") return "—";
  const num = parseFloat(n);
  return isNaN(num)
    ? "—"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}

export default function PartsAssemblyPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth({ redirectToSignIn: true });
  const [assemblies, setAssemblies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const fetchAssemblies = () => {
    if (!token) return;
    setLoading(true);
    getAssemblies(token)
      .then(setAssemblies)
      .catch(() => setAssemblies([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAssemblies();
  }, [token]);

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
          className="mb-8 flex items-center justify-between gap-4"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={fadeInUp.transition}
        >
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/parts">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Assembly (BOM)
              </h1>
              <p className="mt-1 text-slate-500 dark:text-slate-400">
                Create and manage parts assemblies.
              </p>
            </div>
          </div>
          <Button
            variant="default"
            onClick={() => setCreateDialogOpen(true)}
            className="gap-2 shrink-0"
          >
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </motion.div>

        <motion.div
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={{ ...fadeInUp.transition, delay: 0.05 }}
        >
          <Card className="dark:border-slate-700 dark:bg-slate-800/50">
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>Loading assemblies…</span>
                </div>
              ) : assemblies.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  There are no assemblies yet. Click Create to add one.
                </div>
              ) : (
                <div className="rounded-lg border dark:border-slate-700 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 dark:bg-slate-800/80">
                        <TableHead className="font-semibold">Equipment</TableHead>
                        <TableHead className="font-semibold">Name</TableHead>
                        <TableHead className="font-semibold">Time to Complete</TableHead>
                        <TableHead className="font-semibold">Cost</TableHead>
                        <TableHead className="font-semibold">List</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assemblies.map((a) => (
                        <TableRow
                          key={a.id}
                          className="cursor-pointer"
                          onClick={() => router.push(`/parts/assembly/${a.id}`)}
                        >
                          <TableCell>{a.equipment_name ?? "—"}</TableCell>
                          <TableCell>{a.assembly_name ?? "—"}</TableCell>
                          <TableCell>
                            {a.estimated_completion_time != null
                              ? `${a.estimated_completion_time} hrs`
                              : "—"}
                          </TableCell>
                          <TableCell>{formatCurrency(a.totalCost)}</TableCell>
                          <TableCell>{formatCurrency(a.totalList)}</TableCell>
                          <TableCell>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <CreateAssemblyDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          token={token}
          onSuccess={fetchAssemblies}
        />
      </div>
    </motion.div>
  );
}
