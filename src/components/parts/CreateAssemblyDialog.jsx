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
import { createAssembly } from "@/lib/api/parts";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function CreateAssemblyDialog({ open, onOpenChange, token, onSuccess }) {
  const [model, setModel] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!token || !name?.trim()) return;
    setLoading(true);
    try {
      await createAssembly(
        {
          model: model.trim() || "",
          name: name.trim(),
          estimated_completion_time: "0",
        },
        token
      );
      toast.success("Assembly has been added.");
      onOpenChange(false);
      setModel("");
      setName("");
      onSuccess?.();
    } catch (err) {
      toast.error(err?.message || "Failed to create assembly");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next) => {
    if (!next) {
      setModel("");
      setName("");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Assembly</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              placeholder="Model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="name">Assembly Name</Label>
            <Input
              id="name"
              placeholder="Assembly Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name?.trim() || loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Add Assembly
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
