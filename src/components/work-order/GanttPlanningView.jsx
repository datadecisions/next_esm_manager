"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Gantt, Willow, WillowDark } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";
import { Maximize2, MoveHorizontal } from "lucide-react";
import { toast } from "sonner";
import {
  getProjectTasks,
  getProjectDependencies,
  createProjectTask,
  updateProjectTask,
  deleteProjectTask,
} from "@/lib/api/work-order";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTheme } from "@/components/ThemeProvider";
import GanttTaskEditDialog from "./GanttTaskEditDialog";

function sortTasksParentsFirst(tasks) {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const result = [];
  function add(task) {
    if (result.some((r) => r.id === task.id)) return;
    const parentId = task.parent_task_id ?? task.parentTaskId ?? 0;
    if (parentId && byId.has(parentId)) {
      add(byId.get(parentId));
    }
    result.push(task);
  }
  tasks.forEach(add);
  return result;
}

function mapTasksToSvar(apiTasks) {
  if (!Array.isArray(apiTasks) || apiTasks.length === 0) return [];
  // Dedupe by id to avoid React "duplicate key" errors
  const seen = new Set();
  const unique = apiTasks.filter((t) => {
    const k = t.id;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const ordered = sortTasksParentsFirst(unique);
  // SVAR Gantt crashes if open:true on leaf tasks (it does forEach on null data)
  const parentIds = new Set(
    ordered.map((t) => Number(t.parent_task_id ?? t.parentTaskId)).filter(Boolean)
  );
  return ordered.map((t) => {
    const start = t.start_date || t.start ? new Date(t.start_date || t.start) : new Date();
    const end = t.end_date || t.end ? new Date(t.end_date || t.end) : new Date(Date.now() + 86400000);
    const progress = t.percentage_complete != null
      ? (Number(t.percentage_complete) <= 1 ? Number(t.percentage_complete) * 100 : Number(t.percentage_complete))
      : 0;
    const hasChildren = parentIds.has(Number(t.id));
    // Milestone: API type "milestone" or same start/end date (and not a parent)
    const isMilestone =
      t.type === "milestone" ||
      (start.getTime() === end.getTime() || (start.toDateString() === end.toDateString() && !hasChildren));
    // Section: API type "summary" or task that has children (sections = summaries)
    const isSection = t.type === "summary" || hasChildren;
    return {
      id: t.id,
      text: t.name ?? t.title ?? "Untitled",
      start,
      end,
      progress: Math.min(100, Math.max(0, progress)),
      type: isMilestone ? "milestone" : isSection ? "summary" : "task",
      parent: Number(t.parent_task_id ?? t.parentTaskId) || 0,
      open: hasChildren, // only expand parents; leaf tasks must have open:false to avoid null.forEach
    };
  });
}

function mapDependenciesToLinks(apiDeps) {
  if (!Array.isArray(apiDeps) || apiDeps.length === 0) return [];
  return apiDeps.map((d, i) => ({
    id: `link-${i}`,
    source: d.previous_task_id,
    target: d.next_task_id,
    type: "e2s",
  }));
}

function computeDateRange(tasks) {
  if (!tasks?.length) {
    const now = new Date();
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 2, 0) };
  }
  let min = Infinity;
  let max = -Infinity;
  tasks.forEach((t) => {
    const s = t.start_date || t.start ? new Date(t.start_date || t.start) : null;
    const e = t.end_date || t.end ? new Date(t.end_date || t.end) : null;
    if (s && !isNaN(s.getTime())) min = Math.min(min, s.getTime());
    if (e && !isNaN(e.getTime())) max = Math.max(max, e.getTime());
  });
  const start = isFinite(min) ? new Date(min) : new Date();
  const end = isFinite(max) ? new Date(max) : new Date(Date.now() + 30 * 86400000);
  start.setDate(1);
  end.setMonth(end.getMonth() + 1);
  return { start, end };
}

const scales = [
  { unit: "month", step: 1, format: "%F %Y" },
  { unit: "day", step: 1, format: "%d" },
];

function toValidDate(val, fallback) {
  const MIN_YEAR = 2000; // treat epoch (1969–1970) and very old dates as invalid
  let d;
  if (val instanceof Date) d = val;
  else if (val != null) d = new Date(val);
  else d = null;
  if (d && !isNaN(d.getTime()) && d.getFullYear() >= MIN_YEAR) return d;
  return fallback instanceof Date ? fallback : new Date(fallback);
}

function GanttChart({ tasks, links, start, end, woNo, token, onRefetch, onTaskUpdate, className = "" }) {
  const { theme } = useTheme();
  const ThemeWrapper = theme === "dark" ? WillowDark : Willow;
  const [ganttApi, setGanttApi] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const lastUserEditedTaskIdRef = React.useRef(null);
  const init = React.useCallback(
    (api) => {
      setGanttApi(api);
      api.intercept("show-editor", ({ id }) => {
        if (id) {
          const store = api.getState();
          const tasks = store?.tasks;
          const task = tasks?.byId?.(id) ?? tasks?.get?.(id) ?? null;
          setEditingTask(task);
        }
        return false;
      });
      if (!woNo || !token || !onRefetch) return;

      const defaultStart = start instanceof Date ? start : new Date();
      const defaultEnd = end instanceof Date ? end : new Date(Date.now() + 86400000);

      const persistTaskUpdate = async (id, t) => {
        const isSection = t.type === "summary"; // Sections = summaries (parent tasks with children)
        const isUserEdit = lastUserEditedTaskIdRef.current !== null && Number(lastUserEditedTaskIdRef.current) === Number(id);
        if (isUserEdit) lastUserEditedTaskIdRef.current = null;
        const originalTask = Array.isArray(tasks) ? tasks.find((x) => Number(x.id) === Number(id)) : null;
        // For sections: use original dates when Gantt auto-updated (child edit cascade), else use user's dates
        const useOriginalForSection = isSection && !isUserEdit && originalTask;
        const useStart = useOriginalForSection && originalTask?.start ? originalTask.start : t.start;
        const useEnd = useOriginalForSection && originalTask?.end ? originalTask.end : t.end;
        const taskStart = toValidDate(useStart, defaultStart);
        const isMilestone = t.type === "milestone";
        const taskEnd = isMilestone ? taskStart : toValidDate(useEnd, new Date(taskStart.getTime() + 86400000));
        const rawProgress = t.progress ?? 0;
        const progressPct = Math.round(Math.min(100, Math.max(0, rawProgress <= 1 ? rawProgress * 100 : rawProgress)));
        const payload = {
          id,
          projectId: Number(woNo) || woNo,
          name: t.text ?? t.name ?? "",
          description: (t.text ?? t.name ?? "").toString(),
          start_date: taskStart,
          end_date: taskEnd,
          parent_task_id: t.parent && t.parent !== 0 ? t.parent : null,
          percentage_complete: isMilestone ? 0 : progressPct / 100,
        };
        if (!isSection) onTaskUpdate?.(id, { start_date: taskStart, end_date: taskEnd, percentage_complete: progressPct });
        try {
          await updateProjectTask(payload, token);
          onRefetch();
          toast.success("Task updated");
        } catch (err) {
          onRefetch();
          throw err;
        }
      };

      api.intercept("add-task", async (ev) => {
        // Sections = summaries; only created via Add Section. Use + on a section to add subtasks.
        if (ev.mode !== "child" || !ev.target) {
          toast.error("Add a section above to create sections. Use the + on a section row to add subtasks.");
          return false;
        }
        try {
          const t = ev.task;
          const parentId = Number(ev.target);
          const taskStart = toValidDate(t.start, defaultStart);
          const isMilestone = t.type === "milestone";
          const taskEnd = isMilestone ? taskStart : toValidDate(t.end, new Date(taskStart.getTime() + 86400000));
          const payload = {
            projectId: Number(woNo) || woNo,
            name: t.text ?? "New Task",
            description: (t.text ?? "").toString() || "New Task",
            start_date: taskStart,
            end_date: taskEnd,
            parent_task_id: parentId,
            percentage_complete: isMilestone ? 0 : (t.progress ?? 0),
          };
          const created = await createProjectTask(payload, token);
          if (created?.id) {
            ev.task.id = created.id;
            onRefetch();
            toast.success("Task added");
          }
        } catch (err) {
          toast.error(err?.message || "Failed to save task");
          return false;
        }
      });

      api.intercept("update-task", async (ev) => {
        if (ev.inProgress) return;
        try {
          const storeTask = api.getState()?.tasks?.byId?.(ev.id) ?? api.getState()?.tasks?.get?.(ev.id);
          const t = storeTask ? { ...storeTask, ...(ev.task ?? {}) } : (ev.task ?? ev);
          await persistTaskUpdate(ev.id ?? t.id, t);
        } catch (err) {
          toast.error(err?.message || "Failed to update task");
          return false;
        }
      });

      api.intercept("delete-task", async (ev) => {
        try {
          const id = ev.id ?? ev.task?.id;
          if (id) {
            await deleteProjectTask(id, token);
            onRefetch();
            toast.success("Task deleted");
          }
        } catch (err) {
          toast.error(err?.message || "Failed to delete task");
          return false;
        }
      });

      api.intercept("drag-task", () => false);
    },
    [woNo, token, onRefetch, onTaskUpdate, start, end, tasks]
  );

  return (
    <div className={`min-h-[400px] [&_.wx-willow-theme]:rounded-xl [&_.wx-willow-dark-theme]:rounded-xl gantt-scrollbar-fix ${className}`}>
      <style>{`
        /* Hide horizontal scrollbar to avoid overlap with last task row; scroll via Shift+wheel or trackpad */
        .gantt-scrollbar-fix [class*="wx-chart"] {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .gantt-scrollbar-fix [class*="wx-chart"]::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <ThemeWrapper>
        <Gantt
          tasks={tasks}
          links={links}
          scales={scales}
          start={start}
          end={end}
          init={init}
        />
        <GanttTaskEditDialog
          task={editingTask}
          api={ganttApi}
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
          onBeforeSave={(id) => { lastUserEditedTaskIdRef.current = id; }}
        />
      </ThemeWrapper>
    </div>
  );
}

export default function GanttPlanningView({ woNo, token }) {
  const [tasks, setTasks] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const refetch = React.useCallback(() => {
    if (!woNo || !token) return;
    Promise.all([
      getProjectTasks(woNo, token),
      getProjectDependencies(woNo, token),
    ])
      .then(([taskData, depData]) => {
        setTasks(Array.isArray(taskData) ? taskData : []);
        setLinks(Array.isArray(depData) ? depData : []);
      })
      .catch(() => {
        setTasks([]);
        setLinks([]);
      });
  }, [woNo, token]);

  const onTaskUpdate = React.useCallback((id, updates) => {
    setTasks((prev) =>
      prev.map((t) => (String(t.id) === String(id) ? { ...t, ...updates } : t))
    );
  }, []);

  useEffect(() => {
    if (!woNo || !token) {
      queueMicrotask(() => {
        setTasks([]);
        setLinks([]);
        setLoading(false);
      });
      return;
    }
    queueMicrotask(() => setLoading(true));
    Promise.all([
      getProjectTasks(woNo, token),
      getProjectDependencies(woNo, token),
    ])
      .then(([taskData, depData]) => {
        setTasks(Array.isArray(taskData) ? taskData : []);
        setLinks(Array.isArray(depData) ? depData : []);
      })
      .catch(() => {
        setTasks([]);
        setLinks([]);
      })
      .finally(() => setLoading(false));
  }, [woNo, token]);

  const svarTasks = useMemo(() => mapTasksToSvar(tasks), [tasks]);
  const svarLinks = useMemo(() => mapDependenciesToLinks(links), [links]);
  const { start, end } = useMemo(() => computeDateRange(tasks), [tasks]);

  useEffect(() => {
    if (svarTasks.length === 0) return;
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        setExpanded(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [svarTasks.length]);

  if (loading) {
    return (
      <Card className="rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800/50">
        <CardContent className="py-12 text-center text-muted-foreground">
          Loading planning tasks…
        </CardContent>
      </Card>
    );
  }

  if (svarTasks.length === 0) {
    return (
      <Card className="rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800/50">
        <CardContent className="py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No sections yet. Add a section above to create sections in the Gantt. Use the + on a section row to add subtasks.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800/50 overflow-hidden p-0">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Gantt Planning
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-500 flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5">
                <MoveHorizontal className="h-3 w-3 shrink-0" />
                Shift + scroll or trackpad to pan horizontally
              </span>
              <span className="flex items-center gap-1.5">
                Add sections above; use + on a section to add subtasks
              </span>
              <span className="flex items-center gap-1.5">
                Double-click task to edit name, dates, type (milestone), progress
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded border border-slate-300 dark:border-slate-600 px-1.5 py-0.5 text-[10px] font-mono">Ctrl+F</kbd>
                to expand
              </span>
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(true)}
            className="gap-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <Maximize2 className="h-4 w-4" />
            Expand
            <kbd className="ml-1 rounded border border-slate-300 dark:border-slate-600 px-1.5 py-0.5 text-[10px] font-mono hidden sm:inline">Ctrl+F</kbd>
          </Button>
        </div>
        <CardContent className="p-0 [&_.wx-willow-theme]:rounded-b-xl [&_.wx-willow-dark-theme]:rounded-b-xl">
          <GanttChart
            tasks={svarTasks}
            links={svarLinks}
            start={start}
            end={end}
            woNo={woNo}
            token={token}
            onRefetch={refetch}
            onTaskUpdate={onTaskUpdate}
            className="min-h-[500px]"
          />
        </CardContent>
      </Card>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent
          size="fullscreen"
          className="flex flex-col p-0 gap-0 max-h-[calc(100vh-2rem)] overflow-hidden"
          showCloseButton={true}
        >
          <DialogHeader className="px-6 py-4 border-b shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <DialogTitle>Gantt Planning — Full View</DialogTitle>
            <span className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5">
                <MoveHorizontal className="h-3 w-3 shrink-0" />
                Shift + scroll or trackpad to pan horizontally
              </span>
              <span className="flex items-center gap-1.5">
                Add sections above; use + on a section to add subtasks
              </span>
              <span className="flex items-center gap-1.5">
                Double-click task to edit
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded border px-1.5 py-0.5 text-[10px] font-mono bg-muted">Ctrl+F</kbd>
                to expand
              </span>
            </span>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto p-4">
            <GanttChart
              tasks={svarTasks}
              links={svarLinks}
              start={start}
              end={end}
              woNo={woNo}
              token={token}
              onRefetch={refetch}
              onTaskUpdate={onTaskUpdate}
              className="min-h-[calc(100vh-12rem)]"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}