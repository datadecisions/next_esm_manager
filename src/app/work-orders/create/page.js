"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, User, Wrench } from "lucide-react";
import { fadeInUp } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CustomerCombobox } from "@/components/CustomerCombobox";
import { EquipmentCombobox } from "@/components/EquipmentCombobox";
import { getAuthToken } from "@/lib/auth";
import { getCustomerByNum, getSalesCodes, getExpenseCodes } from "@/lib/api/customer";
import { getBranches, getBranchDepts } from "@/lib/api/dispatch";
import { getOpenOrdersForEquipment } from "@/lib/api/equipment";
import { createWO, uploadWorkOrderImage } from "@/lib/api/work-order";

const DISPOSITION_WO = 1;
const DISPOSITION_QUOTE = 11;

function SectionHeader({ number, title }) {
  return (
    <header className="flex items-center gap-3 mb-5">
      <span
        className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-semibold text-foreground tabular-nums"
        aria-hidden
      >
        {number}
      </span>
      <h2 className="text-lg font-semibold text-foreground">
        {title}
      </h2>
    </header>
  );
}

function SubsectionTitle({ children }) {
  return (
    <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
      {children}
    </h3>
  );
}

export default function WorkOrderCreatePage() {
  const router = useRouter();
  const [disposition, setDisposition] = useState(DISPOSITION_WO);
  const [shipTo, setShipTo] = useState(null);
  const [billTo, setBillTo] = useState(null);
  const [branch, setBranch] = useState("");
  const [dept, setDept] = useState("");
  const [branches, setBranches] = useState([]);
  const [depts, setDepts] = useState([]);
  const [salesCode, setSalesCode] = useState("");
  const [salesCodes, setSalesCodes] = useState([]);
  const [expBranch, setExpBranch] = useState("");
  const [expDept, setExpDept] = useState("");
  const [expBranches, setExpBranches] = useState([]);
  const [expDepts, setExpDepts] = useState([]);
  const [expCode, setExpCode] = useState("");
  const [expenseCodes, setExpenseCodes] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [sequenceMode, setSequenceMode] = useState(false);
  const [woMain, setWoMain] = useState("CUSTOMER");
  const [openOrders, setOpenOrders] = useState([]);
  const [poNo, setPoNo] = useState("");
  const [comments, setComments] = useState("");
  const [privateComments, setPrivateComments] = useState("");
  const [requiresHourMeter, setRequiresHourMeter] = useState(false);
  const [createCounter, setCreateCounter] = useState(1);
  const [forceEquipment, setForceEquipment] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingBranches, setLoadingBranches] = useState(true);

  const token = typeof window !== "undefined" ? getAuthToken() : null;
  const customersSelected = !!shipTo && !!billTo;
  const equipmentEnabled = customersSelected || forceEquipment;

  useEffect(() => {
    if (!token) {
      router.push("/sign-in");
      return;
    }
    getBranches(token)
      .then(setBranches)
      .catch(() => setBranches([]))
      .finally(() => setLoadingBranches(false));
  }, [token, router]);

  useEffect(() => {
    if (!token || !branch) {
      setDepts([]);
      setDept("");
      setSalesCodes([]);
      setSalesCode("");
      return;
    }
    getBranchDepts(branch, token)
      .then((list) => {
        setDepts(list);
        setDept("");
      })
      .catch(() => setDepts([]));
  }, [token, branch]);

  useEffect(() => {
    if (!token || !branch || !dept) {
      setSalesCodes([]);
      setSalesCode("");
      return;
    }
    getSalesCodes(branch, dept, token)
      .then(setSalesCodes)
      .catch(() => setSalesCodes([]));
  }, [token, branch, dept]);

  useEffect(() => {
    if (!token || !expBranch) {
      setExpDepts([]);
      setExpDept("");
      setExpenseCodes([]);
      setExpCode("");
      return;
    }
    getBranchDepts(expBranch, token)
      .then((list) => {
        setExpDepts(list);
        setExpDept("");
      })
      .catch(() => setExpDepts([]));
  }, [token, expBranch]);

  useEffect(() => {
    if (!token || !expBranch || !expDept) {
      setExpenseCodes([]);
      setExpCode("");
      return;
    }
    getExpenseCodes(expBranch, expDept, token)
      .then(setExpenseCodes)
      .catch(() => setExpenseCodes([]));
  }, [token, expBranch, expDept]);

  useEffect(() => {
    setExpBranches(branches);
  }, [branches]);

  useEffect(() => {
    if (!shipTo || !token) {
      setBillTo(null);
      return;
    }
    const billToNum = shipTo.BillTo ?? shipTo.billTo;
    if (!billToNum) {
      setBillTo(null);
      return;
    }
    getCustomerByNum(billToNum, token)
      .then((c) => setBillTo(c || null))
      .catch(() => setBillTo(null));
  }, [shipTo, token]);

  const primaryEquipment = equipments[0];
  useEffect(() => {
    if (!token || !primaryEquipment) {
      setOpenOrders([]);
      return;
    }
    const serial = primaryEquipment?.SerialNo ?? primaryEquipment?.serialNo;
    if (!serial) {
      setOpenOrders([]);
      return;
    }
    getOpenOrdersForEquipment(serial, token)
      .then(setOpenOrders)
      .catch(() => setOpenOrders([]));
  }, [token, primaryEquipment]);


  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!shipTo || !billTo || !branch || !dept) {
      setError("Ship To, Bill To, Branch, and Dept are required.");
      return;
    }
    if (!salesCode) {
      setError("Type of Sale is required.");
      return;
    }
    if (!token) return;
    setLoading(true);
    try {
      const wo = await createWO(
        {
          disposition,
          Disposition: disposition,
          ShipTo: shipTo.Number,
          BillTo: billTo.Number,
          Branch: parseInt(branch, 10),
          Dept: parseInt(dept, 10),
          SalesCode: salesCode,
          ExpBranch: expBranch ? parseInt(expBranch, 10) : undefined,
          ExpDept: expDept ? parseInt(expDept, 10) : undefined,
          ExpCode: expCode || undefined,
          SerialNo: primaryEquipment?.SerialNo ?? primaryEquipment?.serialNo ?? "",
          Make: primaryEquipment?.Make ?? primaryEquipment?.make ?? "",
          Model: primaryEquipment?.Model ?? primaryEquipment?.model ?? "",
          UnitNo: primaryEquipment?.UnitNo ?? primaryEquipment?.unitNo ?? "",
          PONo: poNo || "",
          Comments: comments || "",
          PrivateComments: privateComments || "",
          createCounter: Math.max(1, parseInt(String(createCounter), 10) || 1),
          woType: disposition === DISPOSITION_QUOTE ? "11" : "1",
          forceOrder: forceEquipment ? 1 : 0,
        },
        token
      );
      const createdItems = Array.isArray(wo) ? wo : [wo];
      const primary = createdItems[0];
      if (!primary?.WONo) {
        setError("Work order created but no WO number returned.");
        return;
      }
      if (photos.length > 0) {
        const context = {
          ShipTo: String(shipTo.Number ?? shipTo.number ?? ""),
          BillTo: String(billTo.Number ?? billTo.number ?? ""),
        };
        for (const file of photos) {
          await uploadWorkOrderImage(primary.WONo, file, context, token);
        }
      }
      router.push(`/work-orders/${primary.WONo}`);
    } catch (err) {
      setError(err?.message || "Failed to create work order.");
    } finally {
      setLoading(false);
    }
  }

  const branchOptions = branches.map((b) => ({
    value: String(b.Number ?? b.number ?? b),
    label: `${b.Number ?? b.number ?? b}: ${b.Name ?? b.name ?? ""}`.trim() || String(b.Number ?? b.number ?? b),
  }));
  const deptOptions = depts.map((d) => ({
    value: String(d.Dept ?? d.dept ?? d),
    label: `${d.Dept ?? d.dept ?? d}: ${d.Title ?? d.title ?? ""}`.trim() || String(d.Dept ?? d.dept ?? d),
  }));
  const expBranchOptions = expBranches.map((b) => ({
    value: String(b.Number ?? b.number ?? b),
    label: `${b.Number ?? b.number ?? b}: ${b.Name ?? b.name ?? ""}`.trim() || String(b.Number ?? b.number ?? b),
  }));
  const expDeptOptions = expDepts.map((d) => ({
    value: String(d.Dept ?? d.dept ?? d),
    label: `${d.Dept ?? d.dept ?? d}: ${d.Title ?? d.title ?? ""}`.trim() || String(d.Dept ?? d.dept ?? d),
  }));
  const saleCodeOptions = salesCodes.map((s) => ({
    value: String(s.Code ?? s.code ?? s),
    label: `${s.Code ?? s.code ?? s}: ${s.GeneralDescription ?? s.generalDescription ?? s.Description ?? s.description ?? ""}`.trim() || String(s.Code ?? s.code ?? s),
  }));
  const expenseCodeOptions = expenseCodes.map((e) => ({
    value: String(e.Code ?? e.code ?? e),
    label: `${e.Code ?? e.code ?? e}: ${e.GeneralDescription ?? e.generalDescription ?? e.Description ?? e.description ?? ""}`.trim() || String(e.Code ?? e.code ?? e),
  }));

  return (
    <motion.div
      className="min-h-full text-foreground"
      initial={fadeInUp.initial}
      animate={fadeInUp.animate}
      transition={fadeInUp.transition}
    >
      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/work-orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold text-foreground">
            Create Work Order
          </h1>
        </div>

        <motion.form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm lg:p-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Document type - compact top bar */}
          <div className="rounded-lg bg-muted/60 px-4 py-3 mb-8">
            <span className="text-sm font-medium text-muted-foreground">
              Document type
            </span>
            <RadioGroup
              value={String(disposition)}
              onValueChange={(v) => setDisposition(Number(v))}
              className="mt-3 flex flex-wrap gap-6"
            >
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value={String(DISPOSITION_WO)} id="disposition-wo" />
                <span className="text-sm font-medium text-foreground">Work Order</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value={String(DISPOSITION_QUOTE)} id="disposition-quote" />
                <span className="text-sm font-medium text-foreground">Quote</span>
              </label>
            </RadioGroup>
          </div>

          <div className="space-y-12">
            {/* 1. Financial Information */}
            <section className="space-y-5">
              <SectionHeader number={1} title="Financial Information" />
              <div className="space-y-6">
                <div>
                  <SubsectionTitle>Sale Information</SubsectionTitle>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">
                        Branch
                      </label>
                      <Select
                        value={branch}
                        onValueChange={setBranch}
                        disabled={loadingBranches}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {branchOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">
                        Department
                      </label>
                      <Select
                        value={dept}
                        onValueChange={setDept}
                        disabled={!branch}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose department" />
                        </SelectTrigger>
                        <SelectContent>
                          {deptOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">
                        Type of Sale
                      </label>
                      <Select
                        value={salesCode}
                        onValueChange={setSalesCode}
                        disabled={!branch || !dept}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select type of sale" />
                        </SelectTrigger>
                        <SelectContent>
                          {saleCodeOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div>
                  <SubsectionTitle>Expense Information</SubsectionTitle>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">
                        Branch
                      </label>
                      <Select
                        value={expBranch}
                        onValueChange={setExpBranch}
                        disabled={loadingBranches}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {expBranchOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">
                        Department
                      </label>
                      <Select
                        value={expDept}
                        onValueChange={setExpDept}
                        disabled={!expBranch}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose department" />
                        </SelectTrigger>
                        <SelectContent>
                          {expDeptOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">
                        Type of Expense
                      </label>
                      <Select
                        value={expCode}
                        onValueChange={setExpCode}
                        disabled={!expBranch || !expDept}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select expense type" />
                        </SelectTrigger>
                        <SelectContent>
                          {expenseCodeOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Customer Information */}
            <section className="pt-2">
              <SectionHeader number={2} title="Customer Information" />
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Ship To Customer <span className="text-red-500">*</span>
                  </label>
                  <CustomerCombobox
                    value={shipTo}
                    onValueChange={setShipTo}
                    placeholder="Search customers..."
                    token={token}
                    minChars={2}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Bill To Customer <span className="text-red-500">*</span>
                  </label>
                  <CustomerCombobox
                    value={billTo}
                    onValueChange={setBillTo}
                    placeholder={shipTo ? "Search customers..." : "Select a Ship To customer first"}
                    token={token}
                    minChars={2}
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Purchase Order (PO) Number
                  </label>
                  <Input
                    value={poNo}
                    onChange={(e) => setPoNo(e.target.value)}
                    placeholder="Enter PO number (optional)"
                  />
                </div>
              </div>
            </section>

            {/* 3. Equipment Information */}
            <section className="pt-2">
              <SectionHeader number={3} title="Equipment Information" />
              <div className="space-y-4">
                {!equipmentEnabled && (
                  <p className="text-sm text-muted-foreground">
                    Select Ship To and Bill To customers first
                  </p>
                )}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={forceEquipment}
                    onChange={(e) => setForceEquipment(e.target.checked)}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                  />
                  <span className="text-sm text-muted-foreground">
                    Or force enable
                  </span>
                </label>
                <div className={!equipmentEnabled ? "opacity-50 pointer-events-none" : ""}>
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <label className="block text-sm font-medium text-foreground">
                      Equipment <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setSequenceMode(!sequenceMode)}
                      className={`text-sm underline decoration-dotted underline-offset-2 hover:no-underline ${sequenceMode ? "font-medium text-primary" : "text-muted-foreground"}`}
                    >
                      {sequenceMode ? "✓ " : ""}Sequence Mode
                    </button>
                  </div>
                  {sequenceMode && (
                    <div className="mb-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-200">
                      <strong>Sequence Mode:</strong> Select exactly 2 equipment items (start and end unit numbers)
                    </div>
                  )}
                  <EquipmentCombobox
                    value={equipments}
                    onValueChange={setEquipments}
                    placeholder="Search equipment (type at least 3 characters)..."
                    token={token}
                    minChars={3}
                    shipTo={shipTo}
                    billTo={billTo}
                    forceEnabled={forceEquipment}
                    sequenceMode={sequenceMode}
                    disabled={!equipmentEnabled}
                  />
                </div>
                {primaryEquipment && (primaryEquipment.Location || primaryEquipment.Comments) && (
                  <div className="rounded-lg border border-border bg-muted/50 px-4 py-3">
                    <div className="text-sm font-medium text-foreground mb-1">
                      Equipment Notes
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {[primaryEquipment.Location, primaryEquipment.Comments].filter(Boolean).join(" ")}
                    </div>
                  </div>
                )}
                <div className="grid gap-6 sm:grid-cols-3 mt-6">
                  <div className="sm:col-span-2">
                    {primaryEquipment && (
                      <div className="rounded-lg border border-border overflow-hidden">
                        <div className="bg-muted px-4 py-2 text-sm font-medium text-foreground">
                          Open Orders for This Equipment
                        </div>
                        <div className="max-h-40 overflow-auto">
                          {openOrders.length > 0 ? (
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-border bg-muted/40">
                                  <th className="px-4 py-2 text-left font-medium">Order #</th>
                                  <th className="px-4 py-2 text-left font-medium">Date</th>
                                  <th className="px-4 py-2 text-left font-medium">Comments</th>
                                </tr>
                              </thead>
                              <tbody>
                                {openOrders.map((wo) => (
                                  <tr key={wo.WONo} className="border-b border-border/60">
                                    <td className="px-4 py-2 font-medium">{wo.WONo}</td>
                                    <td className="px-4 py-2">{wo.OpenDate ? new Date(wo.OpenDate).toLocaleDateString() : ""}</td>
                                    <td className="px-4 py-2 truncate max-w-[200px]">{wo.Comments ?? ""}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                              No open orders found
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Billing Type
                    </label>
                    <RadioGroup value={woMain} onValueChange={setWoMain} className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <RadioGroupItem value="CUSTOMER" id="wo-main-customer" />
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Customer Billing</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <RadioGroupItem value="MAINTENANCE" id="wo-main-maintenance" />
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Full Maintenance</span>
                      </label>
                    </RadioGroup>
                  </div>
                </div>
              </div>
            </section>

            {/* 4. Comments */}
            <section className="pt-2">
              <SectionHeader number={4} title="Comments" />
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Private Comments
                  </label>
                  <textarea
                    value={privateComments}
                    onChange={(e) => setPrivateComments(e.target.value)}
                    placeholder="Enter private comments..."
                    rows={2}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/30"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Comments
                  </label>
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Enter comments..."
                    rows={3}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/30"
                  />
                </div>
              </div>
            </section>

            {/* 5. Additional Options */}
            <section className="pt-2">
              <SectionHeader number={5} title="Additional Options" />
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requiresHourMeter}
                      onChange={(e) => setRequiresHourMeter(e.target.checked)}
                      className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                    />
                    <span className="text-sm text-muted-foreground">
                      Requires Hour Meter
                    </span>
                  </label>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Number of Work Orders to Create
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={createCounter}
                      onChange={(e) => setCreateCounter(e.target.value)}
                    />
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Photos
                  </label>
                  <label className="flex flex-col cursor-pointer">
                    <div className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground hover:border-border/80 hover:bg-muted/40 transition-colors">
                      <span className="block mb-1">
                        {photos.length > 0
                          ? `${photos.length} photo${photos.length === 1 ? "" : "s"} selected`
                          : "Choose photos to upload"}
                      </span>
                      <span className="text-xs">Click or drag files here</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setPhotos((prev) => [...prev, ...files]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {photos.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {photos.map((f, i) => (
                        <span
                          key={`${f.name}-${i}`}
                          className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs"
                        >
                          {f.name}
                          <button
                            type="button"
                            onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                            className="ml-1 rounded-full p-0.5 hover:bg-muted/80 text-muted-foreground"
                            aria-label={`Remove ${f.name}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          <div className="mt-8 flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create Work Order"
              )}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/work-orders">Cancel</Link>
            </Button>
          </div>
        </motion.form>
      </div>
    </motion.div>
  );
}
