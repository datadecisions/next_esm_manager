"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Truck,
  Check,
  X,
  Search,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  getPurchaseOrder,
  receivePOItems,
} from "@/lib/api/purchase-order";
import { PurchaseOrderSearchCombobox } from "@/components/PurchaseOrderSearchCombobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { fadeIn, fadeInUp } from "@/lib/motion";

function formatCurrency(n) {
  if (n == null || n === "") return "-";
  const num = parseFloat(n);
  return isNaN(num)
    ? "-"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}

export default function PartsReceivePage() {
  const { token, isLoading: authLoading } = useAuth({ redirectToSignIn: true });
  const [selectedPO, setSelectedPO] = useState(null);
  const [poData, setPoData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortProp, setSortProp] = useState("Description");
  const [sortReverse, setSortReverse] = useState(false);
  const [editingQty, setEditingQty] = useState(null);

  const handleSelectPO = useCallback(
    async (po) => {
      if (!token) return;
      if (!po?.PONo) {
        setSelectedPO(null);
        setPoData(null);
        return;
      }
      setLoading(true);
      setSelectedPO(po);
      try {
        const data = await getPurchaseOrder(po.PONo, token);
        const parts = (data.parts ?? []).map((p) => ({
          ...p,
          answer: p.RecvQty != null && p.RecvQty === p.Qty,
        }));
        setPoData({ ...data, parts });
      } catch (err) {
        toast.error(err?.message || "Failed to load purchase order");
        setPoData(null);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  const handleCheckInventory = async (part, pass) => {
    if (!token) return;
    part.answer = pass;
    if (pass) part.RecvQty = part.Qty;
    try {
      await receivePOItems(
        {
          ID: part.ID,
          RecvQty: pass ? part.Qty : part.RecvQty ?? 0,
          Warehouse: part.Warehouse || "Main",
          PartNo: part.PartNo,
        },
        token
      );
      setPoData((prev) =>
        prev
          ? {
              ...prev,
              parts: prev.parts.map((p) =>
                p.ID === part.ID ? { ...p, answer: pass, RecvQty: pass ? part.Qty : p.RecvQty } : p
              ),
            }
          : null
      );
    } catch {
      toast.error("Failed to update receive");
    }
  };

  const handleReceiveQty = async (part, value) => {
    if (!token) return;
    const num = parseInt(value, 10);
    const qty = isNaN(num) ? 0 : num;
    try {
      await receivePOItems(
        {
          ID: part.ID,
          RecvQty: qty,
          Warehouse: part.Warehouse || "Main",
          PartNo: part.PartNo,
        },
        token
      );
      setPoData((prev) =>
        prev
          ? {
              ...prev,
              parts: prev.parts.map((p) =>
                p.ID === part.ID ? { ...p, RecvQty: qty, answer: qty === p.Qty } : p
              ),
            }
          : null
      );
    } catch {
      toast.error("Failed to update receive");
    }
    setEditingQty(null);
  };

  const filteredParts = useMemo(() => {
    const list = poData?.parts ?? [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return [...list].sort((a, b) => {
        const av = a[sortProp] ?? "";
        const bv = b[sortProp] ?? "";
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
        return sortReverse ? -cmp : cmp;
      });
    }
    const filtered = list.filter(
      (p) =>
        (p.PartNo ?? "").toLowerCase().includes(q) ||
        (p.Description ?? "").toLowerCase().includes(q)
    );
    return filtered.sort((a, b) => {
      const av = a[sortProp] ?? "";
      const bv = b[sortProp] ?? "";
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortReverse ? -cmp : cmp;
    });
  }, [poData?.parts, searchQuery, sortProp, sortReverse]);

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
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Receive Orders
              {selectedPO && (
                <span className="text-xl font-normal text-slate-600 dark:text-slate-400">
                  #{selectedPO.PONo} {selectedPO.VendorName ?? ""}
                </span>
              )}
            </h1>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              Search for a purchase order and receive parts.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={{ ...fadeInUp.transition, delay: 0.05 }}
        >
          <Card className="dark:border-slate-700 dark:bg-slate-800/50">
            <CardContent className="pt-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Purchase Order</label>
                <PurchaseOrderSearchCombobox
                  value={selectedPO}
                  onValueChange={(v) => {
                    setSelectedPO(v);
                    if (!v) setPoData(null);
                  }}
                  onSelect={handleSelectPO}
                  placeholder="Search PO#"
                  token={token}
                  minChars={1}
                  includeClosed={true}
                />
              </div>

              {loading && (
                <div className="flex items-center gap-2 text-muted-foreground py-8">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading purchase order...</span>
                </div>
              )}

              {!loading && poData && poData.parts?.length === 0 && (
                <div className="rounded-lg border dark:border-slate-700 p-12 text-center text-muted-foreground">
                  There are no parts in this purchase order.
                </div>
              )}

              {!loading && poData && poData.parts?.length > 0 && (
                <>
                  <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search for parts"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <div className="flex flex-wrap gap-4">
                    {filteredParts.map((part) => (
                      <Card
                        key={part.ID}
                        className="w-full sm:w-[320px] dark:border-slate-700 dark:bg-slate-800/30"
                      >
                        <CardContent className="pt-4 pb-4">
                          <div className="text-center mb-3">
                            <h5 className="font-semibold text-slate-900 dark:text-white">
                              {part.PartNo} ({part.Qty}) {formatCurrency(part.CostEach)}
                            </h5>
                            <p className="text-sm text-muted-foreground mt-0.5 truncate" title={part.Description}>
                              {part.Description}
                            </p>
                            {part.WONo && (
                              <p className="text-sm font-medium mt-1">
                                Customer Order: {part.WONo}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2 border-t dark:border-slate-700 pt-3">
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant={part.answer === true ? "default" : "ghost"}
                                className={`h-8 w-8 ${
                                  part.answer === true ? "bg-green-600 hover:bg-green-700" : ""
                                }`}
                                onClick={() => handleCheckInventory(part, true)}
                                title="Pass (full qty)"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant={part.answer === false ? "destructive" : "ghost"}
                                className="h-8 w-8"
                                onClick={() => handleCheckInventory(part, false)}
                                title="Partial receive"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            {part.answer === false ? (
                              <Input
                                type="number"
                                className="w-20 h-8"
                                value={
                                  editingQty?.id === part.ID
                                    ? editingQty.value
                                    : String(part.RecvQty ?? "")
                                }
                                onChange={(e) =>
                                  setEditingQty({ id: part.ID, value: e.target.value })
                                }
                                onBlur={(e) => handleReceiveQty(part, e.target.value)}
                                onFocus={() =>
                                  setEditingQty({
                                    id: part.ID,
                                    value: String(part.RecvQty ?? ""),
                                  })
                                }
                              />
                            ) : (
                              <p className="text-sm font-medium">Recv: {part.RecvQty ?? "-"}</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}

              {!loading && !poData && selectedPO && (
                <div className="rounded-lg border dark:border-slate-700 p-12 text-center text-muted-foreground">
                  Could not load purchase order. Try selecting again.
                </div>
              )}

              {!loading && !selectedPO && (
                <div className="rounded-lg border dark:border-slate-700 p-12 text-center text-muted-foreground">
                  Search for a purchase order by PO number or vendor name.
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
