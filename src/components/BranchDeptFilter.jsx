"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, Loader2, Building2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getBranches, getBranchDepts } from "@/lib/api/dispatch";
import { cn } from "@/lib/utils";

/**
 * Reusable Branch & Department multi-select filter.
 * Used for filtering lists by SaleBranch and SaleDept (e.g. recurring orders, reports).
 *
 * @param {object} value - { branches: Array<{Number, Name}>, depts: Array<{Dept, Title}>, selectAllDepts: boolean }
 * @param {function} onChange - (value) => void
 * @param {string} token - Auth token
 * @param {string} [className] - Optional class for the trigger button
 */
export function BranchDeptFilter({ value, onChange, token, className }) {
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState([]);
  const [depts, setDepts] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [branchSearch, setBranchSearch] = useState("");
  const [deptSearch, setDeptSearch] = useState("");

  const selectedBranches = value?.branches ?? [];
  const selectedDepts = value?.depts ?? [];
  const selectAllDepts = value?.selectAllDepts ?? false;

  useEffect(() => {
    if (!token) return;
    setLoadingBranches(true);
    getBranches(token)
      .then(setBranches)
      .catch(() => setBranches([]))
      .finally(() => setLoadingBranches(false));
  }, [token]);

  useEffect(() => {
    if (!token || selectedBranches.length === 0) {
      setDepts([]);
      return;
    }
    const branchNum = selectedBranches[0]?.Number ?? selectedBranches[0];
    setLoadingDepts(true);
    getBranchDepts(branchNum, token)
      .then(setDepts)
      .catch(() => setDepts([]))
      .finally(() => setLoadingDepts(false));
  }, [token, selectedBranches]);

  const toggleBranch = useCallback(
    (branch) => {
      const has = selectedBranches.some(
        (b) => (b.Number ?? b) === (branch.Number ?? branch)
      );
      let next;
      if (has) {
        next = selectedBranches.filter(
          (b) => (b.Number ?? b) !== (branch.Number ?? branch)
        );
      } else {
        next = [...selectedBranches, branch];
      }
      onChange?.({ ...value, branches: next, depts: [], selectAllDepts: false });
    },
    [value, selectedBranches, onChange]
  );

  const toggleDept = useCallback(
    (dept) => {
      if (selectAllDepts) return;
      const has = selectedDepts.some(
        (d) => (d.Dept ?? d) === (dept.Dept ?? dept)
      );
      let next;
      if (has) {
        next = selectedDepts.filter(
          (d) => (d.Dept ?? d) !== (dept.Dept ?? dept)
        );
      } else {
        next = [...selectedDepts, dept];
      }
      onChange?.({ ...value, depts: next });
    },
    [value, selectedDepts, selectAllDepts, onChange]
  );

  const setSelectAllDepts = useCallback(
    (checked) => {
      onChange?.({
        ...value,
        selectAllDepts: checked,
        depts: checked ? depts : [],
      });
    },
    [value, depts, onChange]
  );

  const branchFiltered = branches.filter((b) => {
    const q = branchSearch.toLowerCase();
    if (!q) return true;
    const num = String(b.Number ?? "");
    const name = String(b.Name ?? "").toLowerCase();
    return num.includes(q) || name.includes(q);
  });

  const deptFiltered = depts.filter((d) => {
    const q = deptSearch.toLowerCase();
    if (!q) return true;
    const dept = String(d.Dept ?? "").toLowerCase();
    const title = String(d.Title ?? "").toLowerCase();
    return dept.includes(q) || title.includes(q);
  });

  const summary = [];
  if (selectedBranches.length > 0) {
    summary.push(
      selectedBranches.length === 1
        ? `${selectedBranches[0].Number}: ${selectedBranches[0].Name}`
        : `${selectedBranches.length} branches`
    );
  } else {
    summary.push("All branches");
  }
  if (selectAllDepts) {
    summary.push("All depts");
  } else if (selectedDepts.length > 0) {
    summary.push(
      selectedDepts.length === 1
        ? `${selectedDepts[0].Dept}: ${selectedDepts[0].Title}`
        : `${selectedDepts.length} depts`
    );
  } else {
    summary.push("All depts");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("min-w-[200px] justify-between", className)}
        >
          <span className="truncate">{summary.join(" · ")}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <div className="flex flex-col gap-4 p-3">
          {/* Branches */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Branches</Label>
            </div>
            <Input
              placeholder="Search branches..."
              value={branchSearch}
              onChange={(e) => setBranchSearch(e.target.value)}
              className="h-8 mb-2"
            />
            <div className="max-h-40 overflow-y-auto rounded-md border p-2 space-y-1">
              {loadingBranches ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : branchFiltered.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No branches found
                </p>
              ) : (
                branchFiltered.map((branch) => {
                  const checked = selectedBranches.some(
                    (b) => (b.Number ?? b) === (branch.Number ?? branch)
                  );
                  return (
                    <label
                      key={branch.Number}
                      className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleBranch(branch)}
                        className="rounded border-input"
                      />
                      <span>
                        {branch.Number}: {branch.Name}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Departments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Departments</Label>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectAllDepts}
                  onChange={(e) => setSelectAllDepts(e.target.checked)}
                  className="rounded border-input"
                />
                All Depts
              </label>
            </div>
            <Input
              placeholder="Search departments..."
              value={deptSearch}
              onChange={(e) => setDeptSearch(e.target.value)}
              className="h-8 mb-2"
              disabled={selectAllDepts}
            />
            <div className="max-h-40 overflow-y-auto rounded-md border p-2 space-y-1">
              {loadingDepts ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : selectedBranches.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  Select branches first
                </p>
              ) : deptFiltered.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No departments found
                </p>
              ) : (
                deptFiltered.map((dept) => {
                  const checked = selectAllDepts || selectedDepts.some(
                    (d) => (d.Dept ?? d) === (dept.Dept ?? dept)
                  );
                  return (
                    <label
                      key={dept.Dept}
                      className={cn(
                        "flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer text-sm",
                        selectAllDepts && "opacity-50",
                        !selectAllDepts && "hover:bg-muted/50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDept(dept)}
                        disabled={selectAllDepts}
                        className="rounded border-input"
                      />
                      <span>
                        {dept.Dept}: {dept.Title}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Filter items by selected branches and departments.
 * When nothing selected: returns all items.
 * When branches/depts selected: returns items matching SaleBranch AND SaleDept.
 *
 * @param {Array} items - Items with SaleBranch, SaleDept
 * @param {object} filterValue - { branches, depts, selectAllDepts }
 * @returns {Array} Filtered items
 */
export function filterByBranchDept(items, filterValue) {
  if (!items || !Array.isArray(items)) return [];
  const branches = filterValue?.branches ?? [];
  const depts = filterValue?.depts ?? [];
  const selectAllDepts = filterValue?.selectAllDepts ?? false;

  if (branches.length === 0 && depts.length === 0 && !selectAllDepts) {
    return items;
  }

  return items.filter((item) => {
    const branchMatch =
      branches.length === 0 ||
      branches.some((b) => item.SaleBranch === (b.Number ?? b));
    const deptMatch =
      selectAllDepts ||
      depts.length === 0 ||
      depts.some((d) => item.SaleDept === (d.Dept ?? d));
    return branchMatch && deptMatch;
  });
}
