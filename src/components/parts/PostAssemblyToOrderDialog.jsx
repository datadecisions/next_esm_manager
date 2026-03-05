"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { postAssemblyToWorkOrder } from "@/lib/api/work-order";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function PostAssemblyToOrderDialog({ open, onOpenChange, assemblyId, token }) {
  const router = useRouter();
  const [woNo, setWoNo] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePost = async () => {
    if (!token || !assemblyId) return;
    const num = woNo?.trim();
    if (!num) {
      toast.error("Enter a work order number.");
      return;
    }
    setLoading(true);
    try {
      await postAssemblyToWorkOrder({ woNo: num, assemblyId }, token);
      toast.success(`Assembly added to work order #${num}.`);
      onOpenChange(false);
      setWoNo("");
      router.push(`/work-orders/${num}`);
    } catch (err) {
      toast.error(err?.message || "Failed to add assembly to work order");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next) => {
    if (!next) setWoNo("");
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Post Assembly to Order</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Work Order Number</Label>
            <Input
              placeholder="e.g. 12345"
              value={woNo}
              onChange={(e) => setWoNo(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handlePost} disabled={!woNo?.trim() || loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Add to Work Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
