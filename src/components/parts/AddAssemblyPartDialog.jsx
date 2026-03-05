"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PartsSearchCombobox } from "@/components/PartsSearchCombobox";
import { addAssemblyPart, getWarehouses } from "@/lib/api/parts";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

function getWarehouseValue(w) {
  return String(w?.WebWarehouse ?? w?.Warehouse ?? w ?? "");
}

export function AddAssemblyPartDialog({ open, onOpenChange, assemblyId, token, onSuccess }) {
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [selectedPart, setSelectedPart] = useState(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token || !open) return;
    getWarehouses(token)
      .then((data) => {
        setWarehouses(data);
        if (data.length > 0) {
          const first = getWarehouseValue(data[0]);
          setSelectedWarehouse((prev) => prev || first);
        }
      })
      .catch(() => setWarehouses([]));
  }, [token, open]);

  const handleAdd = async () => {
    if (!token || !assemblyId || !selectedPart) {
      toast.error("Please select a part.");
      return;
    }
    const numQty = parseInt(qty, 10);
    if (isNaN(numQty) || numQty < 1) {
      toast.error("Enter a valid quantity (min 1).");
      return;
    }
    setLoading(true);
    try {
      await addAssemblyPart(
        {
          id: assemblyId,
          partNo: selectedPart.PartNo,
          warehouse: selectedWarehouse || selectedPart.Warehouse,
          qty: numQty,
          description: selectedPart.Description,
          cost: selectedPart.Cost,
        },
        token
      );
      toast.success("Part added to assembly.");
      onOpenChange(false);
      setSelectedPart(null);
      setQty(1);
      onSuccess?.();
    } catch (err) {
      toast.error(err?.message || "Failed to add part");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next) => {
    if (!next) {
      setSelectedPart(null);
      setQty(1);
    }
    onOpenChange(next);
  };

  const maxQty = selectedPart?.Qty ?? selectedPart?.OnHand ?? 999;
  const minQty = maxQty <= 0 ? 0 : 1;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Part to Assembly</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Warehouse</Label>
            <Select
              value={selectedWarehouse}
              onValueChange={setSelectedWarehouse}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => {
                  const val = getWarehouseValue(w);
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
          <div>
            <Label>Part</Label>
            <div className="mt-1">
              <PartsSearchCombobox
                value={selectedPart}
                onValueChange={setSelectedPart}
                onSelect={setSelectedPart}
                token={token}
                warehouse={selectedWarehouse}
                searchAll={false}
                selectOnly
                placeholder="Search for parts..."
                minChars={2}
              />
            </div>
            {selectedPart && (
              <p className="mt-1 text-xs text-muted-foreground">
                Available: {selectedPart.Qty ?? selectedPart.OnHand ?? "—"}
              </p>
            )}
          </div>
          <div>
            <Label>Quantity</Label>
            <Input
              type="number"
              min={minQty}
              max={maxQty}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!selectedPart || loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Add Part
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
