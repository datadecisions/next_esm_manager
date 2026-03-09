"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Layers, Loader2, FileText, Upload, Plus, MoreHorizontal } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getAssembly, getAssemblyImagesMetadata, uploadAssemblyImage } from "@/lib/api/parts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import DocumentViewerDialog from "@/components/DocumentViewerDialog";
import { AddAssemblyPartDialog } from "@/components/parts/AddAssemblyPartDialog";
import { AddAssemblyMiscDialog } from "@/components/parts/AddAssemblyMiscDialog";
import { PostAssemblyToOrderDialog } from "@/components/parts/PostAssemblyToOrderDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fadeIn, fadeInUp } from "@/lib/motion";

function formatCurrency(n) {
  if (n == null || n === "") return "—";
  const num = parseFloat(n);
  return isNaN(num)
    ? "—"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}

export default function AssemblyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const { token, isLoading: authLoading } = useAuth({ redirectToSignIn: true });
  const [assembly, setAssembly] = useState(null);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docSections, setDocSections] = useState([]);
  const [docsDialogOpen, setDocsDialogOpen] = useState(false);
  const [docsDragOver, setDocsDragOver] = useState(false);
  const [docsUploading, setDocsUploading] = useState(false);
  const [addPartOpen, setAddPartOpen] = useState(false);
  const [addMiscOpen, setAddMiscOpen] = useState(false);
  const [postToOrderOpen, setPostToOrderOpen] = useState(false);

  const fetchAssembly = useCallback(() => {
    if (!token || !id) return;
    setLoading(true);
    getAssembly(id, token)
      .then(setAssembly)
      .catch(() => setAssembly(null))
      .finally(() => setLoading(false));
  }, [token, id]);

  const fetchDocs = useCallback(async () => {
    if (!token || !id) return;
    setDocsLoading(true);
    try {
      const data = await getAssemblyImagesMetadata(id, token);
      setDocs(data);
      setDocSections([
        {
          title: "Assembly Documents",
          docs: data,
          basePath: "/api/v1/parts/assembly_image",
          canDelete: false,
        },
      ]);
    } catch {
      setDocs([]);
      setDocSections([]);
    } finally {
      setDocsLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    fetchAssembly();
  }, [fetchAssembly]);

  useEffect(() => {
    if (assembly) fetchDocs();
  }, [assembly, fetchDocs]);

  const handleDocsDrop = async (e) => {
    e.preventDefault();
    setDocsDragOver(false);
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (!files.length || !token || !assembly?.id) return;
    setDocsUploading(true);
    try {
      for (const file of files) {
        await uploadAssemblyImage(assembly.id, file, token);
      }
      // Brief delay so backend can commit before we refetch
      await new Promise((r) => setTimeout(r, 300));
      await fetchDocs();
      toast.success(files.length === 1 ? "Document uploaded" : `${files.length} documents uploaded`);
    } catch (err) {
      toast.error(err?.message || "Failed to upload documents");
    } finally {
      setDocsUploading(false);
    }
  };

  const handleDocsFileSelect = async (e) => {
    const files = Array.from(e.target?.files ?? []);
    e.target.value = "";
    if (!files.length || !token || !assembly?.id) return;
    setDocsUploading(true);
    try {
      for (const file of files) {
        await uploadAssemblyImage(assembly.id, file, token);
      }
      // Brief delay so backend can commit before we refetch
      await new Promise((r) => setTimeout(r, 300));
      await fetchDocs();
      toast.success(files.length === 1 ? "Document uploaded" : `${files.length} documents uploaded`);
    } catch (err) {
      toast.error(err?.message || "Failed to upload documents");
    } finally {
      setDocsUploading(false);
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
          className="mb-8 flex items-center gap-4"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={fadeInUp.transition}
        >
          <Button variant="ghost" size="icon" asChild>
            <Link href="/parts/assembly">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Assembly Details
            </h1>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              {assembly
                ? `${assembly.equipment_name ?? ""} ${assembly.assembly_name ?? ""}`.trim() || "Assembly"
                : "Loading…"}
            </p>
          </div>
          {assembly && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setPostToOrderOpen(true)}>
                  Post to Order
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/purchase-orders/open")}>
                  Search Purchase Orders
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </motion.div>

        <motion.div
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={{ ...fadeInUp.transition, delay: 0.05 }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading…</span>
            </div>
          ) : !assembly ? (
            <Card className="dark:border-slate-700 dark:bg-slate-800/50">
              <CardContent className="py-12 text-center text-muted-foreground">
                Assembly not found.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Header summary */}
              <Card className="dark:border-slate-700 dark:bg-slate-800/50">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>
                    {assembly.equipment_name ?? ""} {assembly.assembly_name ?? ""}
                  </CardTitle>
                  <span className="text-sm text-muted-foreground">
                    Estimated time: {assembly.estimated_completion_time ?? "0"} hrs
                  </span>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Total Cost: {formatCurrency(assembly.totalCost)} · List: {formatCurrency(assembly.totalList)}
                  </p>
                </CardContent>
              </Card>

              {/* Parts */}
              <Card className="dark:border-slate-700 dark:bg-slate-800/50">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Parts</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddPartOpen(true)}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Part
                  </Button>
                </CardHeader>
                <CardContent>
                  {assembly.parts?.length > 0 ? (
                    <div className="rounded-lg border dark:border-slate-700 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 dark:bg-slate-800/80">
                            <TableHead className="font-semibold">Part #</TableHead>
                            <TableHead className="font-semibold">Description</TableHead>
                            <TableHead className="font-semibold text-right">Qty</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {assembly.parts.map((p, i) => (
                            <TableRow key={`${p.part_no}-${p.warehouse_name}-${i}`}>
                              <TableCell className="font-medium">
                                <span>{p.part_no ?? "—"}</span>
                                {p.warehouse_name && (
                                  <span className="block text-xs text-muted-foreground font-normal">
                                    {p.warehouse_name}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>{p.description ?? "—"}</TableCell>
                              <TableCell className="text-right">{p.qty ?? "—"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="py-8 text-center text-muted-foreground">
                      There are no parts for this assembly.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Miscellaneous */}
              <Card className="dark:border-slate-700 dark:bg-slate-800/50">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Miscellaneous</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddMiscOpen(true)}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Misc
                  </Button>
                </CardHeader>
                <CardContent>
                  {assembly.miscs?.length > 0 ? (
                    <div className="rounded-lg border dark:border-slate-700 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 dark:bg-slate-800/80">
                            <TableHead className="font-semibold">Description</TableHead>
                            <TableHead className="font-semibold text-right">Qty</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {assembly.miscs.map((m, i) => (
                            <TableRow key={`${m.misc}-${m.id ?? i}`}>
                              <TableCell>{m.misc ?? "—"}</TableCell>
                              <TableCell className="text-right">{m.qty ?? "—"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="py-8 text-center text-muted-foreground">
                      There are no miscellaneous charges for this assembly.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Documents */}
              <Card className="dark:border-slate-700 dark:bg-slate-800/50">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Documents
                  </CardTitle>
                  {docs.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDocsDialogOpen(true)}
                      disabled={docsLoading || docsUploading}
                    >
                      View All ({docs.length})
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDocsDragOver(true); }}
                    onDragLeave={() => setDocsDragOver(false)}
                    onDrop={handleDocsDrop}
                    className={`relative rounded-xl border-2 border-dashed transition-colors ${
                      docsDragOver
                        ? "border-cyan-400 bg-cyan-50/50 dark:border-cyan-500 dark:bg-cyan-950/30"
                        : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500"
                    } ${docsUploading ? "pointer-events-none opacity-70" : ""}`}
                  >
                    <label className="block cursor-pointer p-6 sm:p-8 text-center">
                      <input
                        type="file"
                        className="hidden"
                        multiple
                        accept="image/*,.pdf"
                        onChange={handleDocsFileSelect}
                      />
                      <Upload className="h-8 w-8 mx-auto mb-2 text-slate-400 dark:text-slate-500" />
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        {docsUploading ? "Uploading…" : "Drag files here or click to upload"}
                      </p>
                    </label>
                  </div>
                  {docs.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {docs.length} document{docs.length !== 1 ? "s" : ""} — click &quot;View All&quot; to open the document viewer.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </motion.div>
      </div>

      <DocumentViewerDialog
        open={docsDialogOpen}
        onOpenChange={setDocsDialogOpen}
        sections={docSections}
        onRefresh={fetchDocs}
        token={token}
        initialLoading={docsLoading}
      />

      <AddAssemblyPartDialog
        open={addPartOpen}
        onOpenChange={setAddPartOpen}
        assemblyId={assembly?.id}
        token={token}
        onSuccess={fetchAssembly}
      />
      <AddAssemblyMiscDialog
        open={addMiscOpen}
        onOpenChange={setAddMiscOpen}
        assemblyId={assembly?.id}
        token={token}
        onSuccess={fetchAssembly}
      />
      <PostAssemblyToOrderDialog
        open={postToOrderOpen}
        onOpenChange={setPostToOrderOpen}
        assemblyId={assembly?.id}
        token={token}
      />
    </motion.div>
  );
}
