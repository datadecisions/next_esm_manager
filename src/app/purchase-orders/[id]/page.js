"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Save,
  FileText,
  Loader2,
  Plus,
  MoreVertical,
  Trash2,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import {
  getPurchaseOrder,
  createPO,
  addPartToPO,
  addMiscToPO,
  addEquipmentToPO,
  deletePOLineItem,
  getPOPdfUrl,
  getBackOrderedParts,
} from "@/lib/api/purchase-order";
import { BACKORDER_PARTS_KEY } from "@/components/purchase-order/BackOrderedPartsTable";
import { getBranches, getBranchDepts } from "@/lib/api/dispatch";
import { getAccounts } from "@/lib/api/accounting";
import { searchCustomers } from "@/lib/api/customer";
import { searchAllParts } from "@/lib/api/parts";
import { VendorCombobox } from "@/components/VendorCombobox";
import { CustomerCombobox } from "@/components/CustomerCombobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { fadeIn, fadeInUp } from "@/lib/motion";

function formatCurrency(n) {
  if (n == null || n === "") return "";
  const num = parseFloat(n);
  return isNaN(num) ? "" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}

function toFixed2(val) {
  if (val == null || val === "") return "";
  const num = parseFloat(val);
  return isNaN(num) ? "" : num.toFixed(2);
}

const ITEM_TYPE_BADGES = {
  part: "bg-primary/15 text-primary",
  equipment: "bg-muted text-muted-foreground",
  misc: "bg-primary/10 text-primary",
};

export default function PurchaseOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  const isNew = !id || id === "new";
  const { token, isLoading: authLoading } = useAuth({ redirectToSignIn: true });

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [po, setPo] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [calculations, setCalculations] = useState({ subTotal: 0, total: 0, tax: 0 });
  const [branches, setBranches] = useState([]);
  const [depts, setDepts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [addTab, setAddTab] = useState("parts");
  const [partsSearch, setPartsSearch] = useState("");
  const [partsResults, setPartsResults] = useState([]);
  const [partsFilter, setPartsFilter] = useState("all");
  const [backOrders, setBackOrders] = useState([]);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const vendor = po?.vendor;
  const shipTo = po?.ship;
  const branch = po?.branch ?? po?.POBranch;
  const dept = po?.dept ?? po?.PODept;

  const loadPo = useCallback(async () => {
    if (!token || isNew) return;
    setLoading(true);
    try {
      const data = await getPurchaseOrder(id, token);
      const poData = data.po || {};
      const formatShipTo = (p) => {
        const out = { ...p };
        if (p.ShipToVendorNo) out.ShipTo = p.ShipToVendorNo;
        return out;
      };
      const formatted = formatShipTo(poData);
      if (poData.VendorNo && !poData.vendor) {
        formatted.vendor = {
          VendorNo: poData.VendorNo,
          Name: poData.VendorName,
          SubName: poData.VendorSubName,
          MailingAddress: poData.VendorAddress,
          MailingCity: poData.VendorCity,
          MailingState: poData.VendorState,
          MailingZipCode: poData.VendorZip,
          Phone: poData.VendorPhone,
          Fax: poData.VendorFax,
        };
      }
      if (poData.ShipToVendorNo && !poData.ship) {
        formatted.ship = {
          Number: poData.ShipToVendorNo,
          Name: poData.ShipToName,
          Address: poData.ShipToAddress,
          City: poData.ShipToCity,
          State: poData.ShipToState,
          Zip: poData.ShipToZip,
        };
      }
      setPo(formatted);
      const equip = (data.equipment || []).map((e) => ({
        ...e,
        itemType: "equipment",
        CostEach: e.Amount,
        qtyToUse: 1,
        isEquipment: true,
      }));
      const misc = (data.misc || []).map((m) => ({
        ...m,
        itemType: "misc",
        CostEach: m.Amount,
        qtyToUse: 1,
        isMisc: true,
        foundPart: { PartNo: "OTHER", Description: m.Description },
      }));
      const parts = (data.parts || []).map((p) => ({
        ...p,
        itemType: "part",
        qtyToUse: p.Qty,
        isPart: true,
        InventoryAccount: p.InvAccount,
      }));
      setLineItems([...equip, ...misc, ...parts]);
      setCalculations(data.calculations || { subTotal: 0, total: 0, tax: 0 });
    } catch (err) {
      toast.error(err?.message || "Failed to load purchase order");
      router.push("/purchase-orders");
    } finally {
      setLoading(false);
    }
  }, [token, id, isNew, router]);

  useEffect(() => {
    if (isNew) {
      setPo({});
      let initialItems = [];
      try {
        const stored = sessionStorage.getItem(BACKORDER_PARTS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            initialItems = parsed.map((p) => ({
              ...p,
              itemType: "part",
              isPart: true,
              CostEach: p.CostEach ?? p.BackorderCost ?? p.CostRate ?? p.Cost,
              qtyToUse: p.qtyToUse ?? p.BOQty ?? p.Qty ?? 1,
            }));
            // Defer removal so React Strict Mode double-mount can read it on second run
            setTimeout(() => sessionStorage.removeItem(BACKORDER_PARTS_KEY), 0);
          }
        }
      } catch {
        // ignore
      }
      setLineItems(initialItems);
      setCalculations({ subTotal: 0, total: 0, tax: 0 });
      setLoading(false);
    } else {
      loadPo();
    }
  }, [isNew, loadPo]);

  useEffect(() => {
    if (!token) return;
    getBranches(token).then(setBranches).catch(() => setBranches([]));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    getAccounts(null, token).then(setAccounts).catch(() => setAccounts([]));
  }, [token]);

  useEffect(() => {
    if (!token || isNew) return;
    getBackOrderedParts(token).then(setBackOrders).catch(() => setBackOrders([]));
  }, [token, isNew]);

  useEffect(() => {
    if (!po?.POBranch && !branch?.Number) return;
    const b = branch?.Number ?? po?.POBranch;
    getBranchDepts(b, token).then(setDepts).catch(() => setDepts([]));
  }, [token, po?.POBranch, branch?.Number]);

  const recalculate = useCallback(() => {
    let sub = 0;
    lineItems.forEach((item) => {
      sub += (parseFloat(item.CostEach) || 0) * (parseInt(item.qtyToUse, 10) || 1);
    });
    setCalculations({ subTotal: sub, total: sub, tax: 0 });
  }, [lineItems]);

  useEffect(() => {
    recalculate();
  }, [recalculate]);

  const handleVendorChange = (v) => {
    if (!v) return;
    setPo((prev) => ({
      ...prev,
      vendor: v,
      VendorNo: v.VendorNo,
      VendorName: v.Name,
      VendorSubName: v.SubName,
      VendorAddress: v.MailingAddress ?? v.Address,
      VendorCity: v.MailingCity ?? v.City,
      VendorState: v.MailingState ?? v.State,
      VendorZip: v.MailingZipCode ?? v.Zip,
      VendorPhone: v.Phone,
      VendorFax: v.Fax,
    }));
  };

  const handleShipToChange = (c) => {
    setPo((prev) => ({
      ...prev,
      ship: c,
      ShipToVendorNo: c?.Number,
      ShipToName: c?.Name,
      ShipToAddress: c?.Address,
      ShipToCity: c?.City,
      ShipToState: c?.State,
      ShipToZip: c?.Zip,
    }));
  };

  const handleBranchChange = (b) => {
    setPo((prev) => ({ ...prev, branch: b, POBranch: b?.Number ?? b }));
    setDepts([]);
    if (b) getBranchDepts(b?.Number ?? b, token).then(setDepts).catch(() => setDepts([]));
  };

  const handleDeptChange = (d) => {
    setPo((prev) => ({ ...prev, dept: d, PODept: d?.Dept ?? d }));
  };

  const searchPartsFn = async () => {
    if (!token) return;
    const url = partsFilter === "backorder" ? null : partsSearch.trim();
    if (partsFilter === "backorder") {
      setPartsResults(backOrders);
      return;
    }
    if (!url || url.length < 2) {
      setPartsResults([]);
      return;
    }
    try {
      const data = await searchAllParts(url, token);
      setPartsResults(
        data.map((p) => ({
          ...p,
          CostRate: p.Cost ?? p.BackorderCost,
          BOQty: p.BackOrder ?? p.Qty,
        }))
      );
    } catch {
      setPartsResults([]);
    }
  };

  const addPartToOrder = (part) => {
    const newPart = {
      ...part,
      itemType: "part",
      CostEach: part.CostRate ?? part.Cost,
      qtyToUse: part.Qty ?? 1,
    };
    setLineItems((prev) => [...prev, newPart]);
    if (part.WOs?.length && po?.Comments) {
      const comment = part.WOs.map((w) => `${part.PartNo} Qty:${w.Qty} ${w.ShipName} Unit:${w.UnitNo}`).join("\n");
      setPo((p) => ({ ...p, Comments: (p.Comments || "") + "\n" + comment }));
    }
    setShowAddItem(false);
  };

  const addEquipmentToOrder = (equip) => {
    const invAccount = equip.InvAccountObj?.AccountNo ?? equip.InventoryAccount;
    if (!equip.Description || !equip.Amount || !invAccount) {
      toast.error("Description, Amount, and Account are required");
      return;
    }
    setLineItems((prev) => [
      ...prev,
      {
        ...equip,
        itemType: "equipment",
        CostEach: equip.Amount ?? equip.CostEach,
        qtyToUse: 1,
        InvAccountObj: equip.InvAccountObj,
        InventoryAccount: invAccount,
      },
    ]);
    setShowAddItem(false);
  };

  const addMiscToOrder = (misc) => {
    if (!misc.Description || !misc.Amount) {
      toast.error("Description and Amount are required");
      return;
    }
    setLineItems((prev) => [
      ...prev,
      {
        ...misc,
        itemType: "misc",
        CostEach: misc.Amount,
        qtyToUse: 1,
      },
    ]);
    setShowAddItem(false);
  };

  const deleteLineItem = async (item) => {
    if (!confirm("Delete this line item?")) return;
    if (item.ID && item.PONo) {
      try {
        await deletePOLineItem(item.ID, item.itemType, token);
      } catch (err) {
        toast.error(err?.message || "Failed to delete");
        return;
      }
    }
    setLineItems((prev) => prev.filter((x) => x !== item));
  };

  const savePO = async () => {
    if (!token) return;
    const branchObj = po?.branch ?? branches.find((b) => String(b.Number ?? b) === String(po?.POBranch));
    const deptObj = po?.dept ?? depts.find((d) => String(d.Dept ?? d) === String(po?.PODept));
    if (!branchObj || !deptObj) {
      toast.error("Select branch and department");
      return;
    }
    if (!vendor) {
      toast.error("Select a vendor");
      return;
    }
    setSaving(true);
    try {
      let ponum = po?.PONo;
      if (!ponum) {
        const created = await createPO(
          {
            POBranch: branchObj.Number ?? branchObj,
            PODept: deptObj.Dept ?? deptObj,
            VendorNo: vendor.VendorNo,
            VendorName: vendor.Name,
            VendorSubName: vendor.SubName ?? "",
            VendorAddress: vendor.MailingAddress ?? vendor.Address ?? "",
            VendorCity: vendor.MailingCity ?? vendor.City ?? "",
            VendorState: vendor.MailingState ?? vendor.State ?? "",
            VendorZip: vendor.MailingZipCode ?? vendor.Zip ?? "",
            VendorPhone: vendor.Phone ?? "",
            VendorFax: vendor.Fax ?? "",
            ShipToVendorNo: shipTo?.Number ?? null,
            ShipToName: shipTo?.Name ?? null,
            ShipToAddress: shipTo?.Address ?? null,
            ShipToCity: shipTo?.City ?? null,
            ShipToState: shipTo?.State ?? null,
            ShipToZip: shipTo?.Zip ?? null,
            DateAdded: po?.OrderDate ?? new Date(),
          },
          token
        );
        ponum = created?.PONo;
        setPo((p) => ({ ...p, PONo: ponum }));
        toast.success(`PO #${ponum} created`);
        router.replace(`/purchase-orders/${ponum}`);
      }

      const promises = [];
      for (const item of lineItems) {
        if (item.OrderNo || item.PONo) continue;
        if (item.itemType === "part") {
          promises.push(
            addPartToPO(
              {
                OrderNo: ponum,
                PartNo: item.PartNo,
                Description: item.Description,
                Qty: item.qtyToUse ?? 1,
                CostEach: item.CostEach,
                Warehouse: item.Warehouse ?? "ORDER",
                InvAccount: item.InvAccountObj?.AccountNo ?? item.InventoryAccount,
                AccruedPOAccount: item.InvAccountObj?.AccountNo ?? item.InventoryAccount,
                woNo: item.WOs?.[0]?.WONo,
              },
              token
            )
          );
        } else if (item.itemType === "misc") {
          const invAcc = item.InvAccountObj?.AccountNo ?? item.InventoryAccount;
          promises.push(
            addMiscToPO(
              {
                PONo: ponum,
                Description: item.Description,
                Amount: item.CostEach,
                AccruedPOAccount: invAcc ?? "",
                InventoryAccount: invAcc ?? "",
                userFullName: "",
              },
              token
            )
          );
        } else if (item.itemType === "equipment") {
          const invAcc = item.InvAccountObj?.AccountNo ?? item.InventoryAccount;
          if (invAcc) {
            promises.push(
              addEquipmentToPO(
                {
                  PONo: ponum,
                  Description: item.Description,
                  SerialNo: item.SerialNo,
                  Amount: item.CostEach,
                  InventoryAccount: invAcc,
                },
                token
              )
            );
          }
        }
      }
      await Promise.all(promises);
      if (promises.length) {
        toast.success("Line items saved");
        loadPo();
      }
    } catch (err) {
      toast.error(err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleExportPdf = async () => {
    if (!po?.PONo || !token) return;
    setPdfLoading(true);
    try {
      const url = await getPOPdfUrl(po.PONo, token);
      setPdfUrl(url);
    } catch (err) {
      toast.error(err?.message || "Failed to generate PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  if (authLoading || !token) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (loading && !isNew) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/purchase-orders">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                Purchase Order {po?.PONo ? `#${po.PONo}` : "(New)"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isNew ? "Create a new purchase order" : "Edit purchase order"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {po?.PONo && (
              <Button variant="outline" onClick={handleExportPdf} disabled={pdfLoading} className="gap-2">
                {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Export PDF
              </Button>
            )}
            <Button onClick={savePO} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>
        </div>

        <motion.div
          className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={fadeInUp.transition}
        >
          {/* Header form */}
          <div className="space-y-6 border-b border-border p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label>Order date</Label>
                <Input
                  type="date"
                  value={po?.OrderDate ? new Date(po.OrderDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setPo((p) => ({ ...p, OrderDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Ship to</Label>
                <div className="mt-1">
                  <CustomerCombobox
                    value={shipTo}
                    onValueChange={handleShipToChange}
                    token={token}
                    placeholder="Search customers..."
                  />
                </div>
              </div>
              <div>
                <Label>Vendor *</Label>
                <div className="mt-1">
                  <VendorCombobox
                    value={vendor}
                    onValueChange={handleVendorChange}
                    token={token}
                    placeholder="Search vendors..."
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <Label>PO No.</Label>
                <Input value={po?.PONo ?? ""} readOnly className="mt-1 bg-muted" />
              </div>
              <div>
                <Label>Branch *</Label>
                <Select
                  value={String(branch?.Number ?? po?.POBranch ?? "")}
                  onValueChange={(v) => handleBranchChange(branches.find((b) => String(b.Number ?? b) === v))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.Number ?? b} value={String(b.Number ?? b)}>
                        {b.Number}: {b.Name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Dept *</Label>
                <Select
                  value={String(dept?.Dept ?? po?.PODept ?? "")}
                  onValueChange={(v) => handleDeptChange(depts.find((d) => String(d.Dept ?? d) === v))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose dept" />
                  </SelectTrigger>
                  <SelectContent>
                    {depts.map((d) => (
                      <SelectItem key={d.Dept ?? d} value={String(d.Dept ?? d)}>
                        {d.Dept}: {d.Title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end justify-end">
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Total</div>
                  <div className="text-2xl font-bold text-primary">
                    {formatCurrency(calculations.total)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="border-b border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Item</TableHead>
                  <TableHead className="w-24 text-right">Price</TableHead>
                  <TableHead className="w-48">Account</TableHead>
                  <TableHead className="w-20">Qty</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item) => (
                  <TableRow key={item.ID ?? `${item.itemType}-${item.PartNo ?? item.Description}-${item.CostEach}`}>
                    <TableCell>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${ITEM_TYPE_BADGES[item.itemType] ?? ""}`}>
                        {item.itemType?.toUpperCase()}
                      </span>
                      <span className="ml-2 font-medium">{item.Description ?? item.PartNo}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{toFixed2(item.CostEach)}</TableCell>
                    <TableCell>
                      <Select
                        value={item.InvAccountObj?.AccountNo ?? item.InventoryAccount ?? ""}
                        onValueChange={(v) => {
                          const acc = accounts.find((a) => a.AccountNo === v);
                          setLineItems((prev) =>
                            prev.map((x) =>
                              x === item ? { ...x, InvAccountObj: acc, InventoryAccount: v } : x
                            )
                          );
                        }}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Account" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((a) => (
                            <SelectItem key={a.AccountNo} value={a.AccountNo}>
                              #{a.AccountNo} {a.Description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        value={item.qtyToUse ?? 1}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10) || 1;
                          setLineItems((prev) =>
                            prev.map((x) => (x === item ? { ...x, qtyToUse: v } : x))
                          );
                        }}
                        className="h-8 w-16"
                        readOnly={!!item.PONo}
                      />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => deleteLineItem(item)} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Add item */}
          <div className="border-b border-border p-4">
            <Button variant="ghost" onClick={() => setShowAddItem(!showAddItem)} className="gap-2 -ml-2">
              <Plus className="h-4 w-4" />
              Add item
            </Button>
          </div>

          {showAddItem && (
            <div className="border-b border-border bg-muted/30 p-6">
              <Tabs value={addTab} onValueChange={setAddTab}>
                <TabsList>
                  <TabsTrigger value="parts">Parts</TabsTrigger>
                  <TabsTrigger value="equipment">Equipment</TabsTrigger>
                  <TabsTrigger value="misc">Misc</TabsTrigger>
                </TabsList>
                <TabsContent value="parts" className="mt-4">
                  <div className="flex gap-4 mb-4">
                    <Input
                      placeholder="Search parts..."
                      value={partsSearch}
                      onChange={(e) => setPartsSearch(e.target.value)}
                      className="flex-1"
                    />
                    <Select value={partsFilter} onValueChange={setPartsFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All parts</SelectItem>
                        <SelectItem value="backorder">Backordered</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={searchPartsFn}>Search</Button>
                  </div>
                  <div className="max-h-48 overflow-auto rounded-lg border border-border bg-background">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead>Part #</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="w-20"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {partsResults.map((p) => (
                          <TableRow key={`${p.PartNo}-${p.Warehouse}`}>
                            <TableCell>{p.Description}</TableCell>
                            <TableCell>{p.PartNo}</TableCell>
                            <TableCell className="text-right">{formatCurrency(p.CostRate ?? p.Cost)}</TableCell>
                            <TableCell>
                              <Button size="sm" onClick={() => addPartToOrder(p)}>
                                Add
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {partsResults.length === 0 && (
                      <div className="py-8 text-center text-muted-foreground text-sm">
                        Search for parts or select Backordered to add from backorder list.
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="equipment" className="mt-4">
                  <AddEquipmentForm onAdd={addEquipmentToOrder} accounts={accounts} />
                </TabsContent>
                <TabsContent value="misc" className="mt-4">
                  <AddMiscForm onAdd={addMiscToOrder} />
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Footer */}
          <div className="p-6 flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <Label>Comments</Label>
              <textarea
                className="mt-1 w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={po?.Comments ?? ""}
                onChange={(e) => setPo((p) => ({ ...p, Comments: e.target.value }))}
                placeholder="Comments..."
              />
            </div>
            <div className="flex flex-col justify-end gap-2 min-w-[140px] shrink-0">
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground shrink-0">Subtotal</span>
                <span className="font-medium tabular-nums text-right">{formatCurrency(calculations.subTotal)}</span>
              </div>
              <div className="flex justify-between gap-4 text-sm font-semibold">
                <span className="shrink-0">Total</span>
                <span className="tabular-nums text-right text-primary">{formatCurrency(calculations.total)}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {pdfUrl && (
        <Dialog open={!!pdfUrl} onOpenChange={() => { setPdfUrl(null); URL.revokeObjectURL(pdfUrl); }}>
          <DialogContent size="pdf" className="max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Purchase Order PDF</DialogTitle>
            </DialogHeader>
            <iframe src={pdfUrl} className="w-full h-[70vh] rounded border" title="PO PDF" />
          </DialogContent>
        </Dialog>
      )}
    </motion.div>
  );
}

function AddEquipmentForm({ onAdd, accounts }) {
  const [desc, setDesc] = useState("");
  const [serial, setSerial] = useState("");
  const [amount, setAmount] = useState("");
  const [account, setAccount] = useState(null);

  const handleAdd = () => {
    onAdd({
      Description: desc,
      SerialNo: serial,
      Amount: parseFloat(amount) || 0,
      InvAccountObj: account,
    });
    setDesc("");
    setSerial("");
    setAmount("");
    setAccount(null);
  };

  return (
    <div className="space-y-4 max-w-md">
      <div>
        <Label>Description *</Label>
        <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Equipment description" className="mt-1" />
      </div>
      <div>
        <Label>Serial #</Label>
        <Input value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="Serial number" className="mt-1" />
      </div>
      <div>
        <Label>Amount *</Label>
        <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" />
      </div>
      <div>
        <Label>Account *</Label>
        <Select value={account?.AccountNo ?? ""} onValueChange={(v) => setAccount(accounts.find((a) => a.AccountNo === v))}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.AccountNo} value={a.AccountNo}>
                #{a.AccountNo} {a.Description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={handleAdd}>Add equipment</Button>
    </div>
  );
}

function AddMiscForm({ onAdd }) {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");

  const handleAdd = () => {
    onAdd({ Description: desc, Amount: parseFloat(amount) || 0 });
    setDesc("");
    setAmount("");
  };

  return (
    <div className="space-y-4 max-w-md">
      <div>
        <Label>Description *</Label>
        <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Item description" className="mt-1" />
      </div>
      <div>
        <Label>Amount *</Label>
        <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" />
      </div>
      <Button onClick={handleAdd}>Add misc item</Button>
    </div>
  );
}
