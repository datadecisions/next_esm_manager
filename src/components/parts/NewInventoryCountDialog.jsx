"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getActiveCounts, createInventoryCount } from "@/lib/api/parts";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function NewInventoryCountDialog({ open, onOpenChange, warehouses, token, onSuccess }) {
  const [warehouse, setWarehouse] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  const inventoryId = useMemo(() => {
    if (!warehouse) return "";
    const now = new Date();
    const month = (now.getMonth() + 1).toString();
    const year = now.getFullYear().toString();
    return `${warehouse}${month}${year}`;
  }, [warehouse]);

  const handleCreate = async () => {
    if (!token || !warehouse) return;
    setLoading(true);
    try {
      setChecking(true);
      const counts = await getActiveCounts(token);
      const exists = counts.some((c) => (c.InventoryID ?? c.InvHeaderID) === inventoryId);
      setChecking(false);

      if (exists) {
        toast.error(`Inventory count ${inventoryId} already exists. Look for it in the active count list.`);
        return;
      }

      await createInventoryCount(
        {
          InventoryID: inventoryId,
          Warehouse1: warehouse,
          ExcludeNew: 0,
          ExcludeDelete: 0,
        },
        token
      );
      toast.success("New inventory count created.");
      onOpenChange(false);
      setWarehouse("");
      onSuccess?.();
    } catch (err) {
      setChecking(false);
      toast.error(err?.message || "Failed to create inventory count");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next) => {
    if (!next) setWarehouse("");
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Inventory Count</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Warehouse</Label>
            <Select value={warehouse} onValueChange={setWarehouse}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => {
                  const val = String(w.WebWarehouse ?? w.Warehouse ?? w ?? "");
                  if (!val) return null;
                  return (
                    <SelectItem key={val} value={val}>
                      {val}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          {inventoryId && (
            <p className="text-sm text-muted-foreground">
              New count ID: <span className="font-mono font-medium">{inventoryId}</span>
              <br />
              <span className="text-xs">(Warehouse + Month + Year)</span>
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!warehouse || loading || checking}>
            {(loading || checking) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
