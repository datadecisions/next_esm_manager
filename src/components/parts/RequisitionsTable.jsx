"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { getPartRequisitions } from "@/lib/api/parts";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

function formatDate(d) {
  if (!d) return "—";
  const date = new Date(d);
  return isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function RequisitionsTable({ token }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!token) return;
    getPartRequisitions(token)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = data.filter((p) => {
    if (!search.trim()) return true;
    const t = search.toLowerCase();
    return (
      (p.PartNo ?? "").toLowerCase().includes(t) ||
      (p.EquipSerialNo ?? "").toLowerCase().includes(t) ||
      (p.Comments ?? "").toLowerCase().includes(t) ||
      (p.DispatchName ?? "").toLowerCase().includes(t)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search requisitions..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />
      <div className="rounded-lg border dark:border-slate-700 overflow-hidden">
        <div className="max-h-[60vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/80">
                <TableHead className="font-semibold">Part No</TableHead>
                <TableHead className="font-semibold">Equipment</TableHead>
                <TableHead className="font-semibold">Comments</TableHead>
                <TableHead className="font-semibold">Ask Date</TableHead>
                <TableHead className="font-semibold">Filled Date</TableHead>
                <TableHead className="font-semibold">Requestor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No open part requisitions.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.id ?? `${row.PartNo}-${row.EquipSerialNo}`}>
                    <TableCell className="font-medium">{row.PartNo ?? "—"}</TableCell>
                    <TableCell>{row.EquipSerialNo ?? "—"}</TableCell>
                    <TableCell>{row.Comments ?? "—"}</TableCell>
                    <TableCell>{formatDate(row.CreatedDate)}</TableCell>
                    <TableCell>{formatDate(row.DateFilled)}</TableCell>
                    <TableCell>{row.DispatchName ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
