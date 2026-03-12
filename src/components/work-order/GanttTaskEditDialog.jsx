"use client";

import React, { useEffect, useState } from "react";
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
import { Loader2, Trash2 } from "lucide-react";

// Sections = summaries; only created via Add Section. Section shown when editing a section row.
const TASK_TYPES = [
  { id: "task", label: "Task" },
  { id: "milestone", label: "Milestone" },
  { id: "summary", label: "Section" },
];

function toDateInputValue(d) {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return new Date(dateStr);
  return new Date(y, m - 1, d);
}

/** Gantt uses exclusive end dates: end=March 21 means bar ends at start of March 21 (last visible day = March 20). */
function parseLocalEndDate(dateStr) {
  const d = parseLocalDate(dateStr);
  if (!d) return null;
  d.setDate(d.getDate() + 1);
  return d;
}

/** Display end date in form: Gantt stores exclusive (March 21 = through March 20), so subtract 1 day for display. */
function toEndDateInputValue(d) {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return "";
  const d2 = new Date(date);
  d2.setDate(d2.getDate() - 1);
  const y = d2.getFullYear();
  const m = String(d2.getMonth() + 1).padStart(2, "0");
  const day = String(d2.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function GanttTaskEditDialog({ task, api, open, onOpenChange, onBeforeSave }) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    text: "",
    type: "task",
    start: "",
    end: "",
    progress: 0,
  });

  useEffect(() => {
    if (!task || !open) return;
    const t = typeof task === "object" ? task : {};
    const start = t.start instanceof Date ? t.start : t.start ? new Date(t.start) : new Date();
    const end = t.end instanceof Date ? t.end : t.end ? new Date(t.end) : new Date(start.getTime() + 86400000);
    setForm({
      text: t.text ?? t.name ?? "",
      type: t.type ?? "task",
      start: toDateInputValue(start),
      end: toEndDateInputValue(end),
      progress: t.progress ?? 0,
    });
  }, [task, open]);

  const isMilestone = form.type === "milestone";

  const handleSave = async (e) => {
    e.preventDefault();
    if (!api || !task?.id) return;
    if (!form.text?.trim()) return;
    setSaving(true);
    try {
      const startDate = form.start ? parseLocalDate(form.start) : new Date();
      const endDate = isMilestone ? startDate : form.end ? parseLocalEndDate(form.end) : new Date(startDate.getTime() + 86400000);
      const updateData = {
        id: task.id,
        task: {
          ...task,
          text: form.text.trim(),
          type: form.type,
          start: startDate,
          end: endDate,
          progress: isMilestone ? 0 : Number(form.progress) || 0,
          parent: task.parent ?? 0,
        },
      };
      onBeforeSave?.(task.id);
      api.exec("update-task", updateData);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!api || !task?.id) return;
    setDeleting(true);
    try {
      api.exec("delete-task", { id: task.id });
      onOpenChange(false);
    } finally {
      setDeleting(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gantt-task-name">Name</Label>
            <Input
              id="gantt-task-name"
              value={form.text}
              onChange={(e) => setForm((p) => ({ ...p, text: e.target.value }))}
              placeholder="Task name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gantt-task-type">Type</Label>
            <Select
              value={form.type}
              onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}
            >
              <SelectTrigger id="gantt-task-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_TYPES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gantt-task-start">Start date</Label>
              <Input
                id="gantt-task-start"
                type="date"
                value={form.start}
                onChange={(e) => setForm((p) => ({ ...p, start: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gantt-task-end">End date</Label>
              <Input
                id="gantt-task-end"
                type="date"
                value={form.end}
                onChange={(e) => setForm((p) => ({ ...p, end: e.target.value }))}
                disabled={isMilestone}
              />
            </div>
          </div>
          {!isMilestone && (
            <div className="space-y-2">
              <Label htmlFor="gantt-task-progress">Progress (%)</Label>
              <Input
                id="gantt-task-progress"
                type="number"
                min={0}
                max={100}
                value={form.progress}
                onChange={(e) => setForm((p) => ({ ...p, progress: e.target.value }))}
              />
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={saving || deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete
            </Button>
            <div className="flex-1" />
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
