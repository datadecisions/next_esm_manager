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
import { Textarea } from "@/components/ui/textarea";
import { addAssemblyMisc } from "@/lib/api/parts";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function AddAssemblyMiscDialog({ open, onOpenChange, assemblyId, token, onSuccess }) {
  const [description, setDescription] = useState("");
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!token || !assemblyId) return;
    const desc = description?.trim();
    if (!desc) {
      toast.error("Enter a description.");
      return;
    }
    const numQty = parseInt(qty, 10);
    if (isNaN(numQty) || numQty < 1) {
      toast.error("Enter a valid quantity (min 1).");
      return;
    }
    setLoading(true);
    try {
      await addAssemblyMisc(
        { id: assemblyId, misc: desc, qty: numQty },
        token
      );
      toast.success("Misc item added to assembly.");
      onOpenChange(false);
      setDescription("");
      setQty(1);
      onSuccess?.();
    } catch (err) {
      toast.error(err?.message || "Failed to add misc");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next) => {
    if (!next) {
      setDescription("");
      setQty(1);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Misc to Assembly</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Description</Label>
            <Textarea
              placeholder="Misc item description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 min-h-[80px]"
            />
          </div>
          <div>
            <Label>Quantity</Label>
            <Input
              type="number"
              min={1}
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
          <Button onClick={handleAdd} disabled={!description?.trim() || loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Add Misc
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
