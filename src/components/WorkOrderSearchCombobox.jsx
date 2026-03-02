"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { getAuthToken } from "@/lib/auth";
import { searchWOs, getDispositionText } from "@/lib/api/work-order";

function useDebounce(fn, delay) {
  const timeoutRef = useRef(null);
  return useCallback(
    (...args) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => fn(...args), delay);
    },
    [fn, delay]
  );
}

export function WorkOrderSearchCombobox() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [showAllResults, setShowAllResults] = useState(null);

  const performSearch = useCallback(async (query) => {
    const token = getAuthToken();
    const trimmed = query.trim();
    if (!token || trimmed.length < 3) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const data = await searchWOs(trimmed, false, token);
      const withText = data.map((item) => ({
        ...item,
        DispositionText: getDispositionText(item.Disposition),
      }));
      setItems(withText);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedSearch = useDebounce(performSearch, 300);

  function handleInputValueChange(v) {
    setInputValue(v);
    setValue(null);
    setShowAllResults(null);
    if (v.trim().length < 3) {
      setItems([]);
    } else {
      debouncedSearch(v);
    }
  }

  function handleValueChange(v) {
    setValue(v);
    if (v) {
      router.push(`/work-orders/${v.WONo}`);
    }
  }

  async function handleShowAll(e) {
    e.preventDefault();
    const q = inputValue.trim();
    if (q.length < 3) return;
    const token = getAuthToken();
    if (!token) return;
    setLoading(true);
    try {
      const data = await searchWOs(q, false, token);
      const withText = data.map((item) => ({
        ...item,
        DispositionText: getDispositionText(item.Disposition),
      }));
      setShowAllResults(withText);
      setItems(withText);
    } catch {
      setShowAllResults([]);
    } finally {
      setLoading(false);
    }
  }
  const hasSearched = inputValue.trim().length >= 3;

  return (
    <div className="space-y-4">
      <form onSubmit={handleShowAll} className="flex gap-3 items-start">
        <Combobox
          items={items}
          value={value}
          onValueChange={handleValueChange}
          inputValue={inputValue}
          onInputValueChange={handleInputValueChange}
          itemToStringValue={(wo) =>
            wo ? `#${wo.WONo} ${wo.ShipName || wo.Name || ""}`.trim() : ""
          }
          isItemEqualToValue={(a, b) => a?.WONo === b?.WONo}
          filter={() => true}
          className="flex-1 max-w-md"
        >
          <ComboboxInput
            placeholder="WO number, customer name, equipment..."
            showClear
            className="w-full"
          />
          <ComboboxContent>
            {loading && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching…
              </div>
            )}
            {!loading && (
              <>
                <ComboboxEmpty>
                  {!hasSearched
                    ? "Type 3+ characters to search..."
                    : "No work orders found."}
                </ComboboxEmpty>
                <ComboboxList>
                  {(wo) => (
                    <ComboboxItem key={wo.WONo} value={wo}>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">#{wo.WONo}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {wo.ShipName || wo.Name || ""} · {wo.Make} {wo.Model}
                        </span>
                      </div>
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </>
            )}
          </ComboboxContent>
        </Combobox>
        <Button type="submit" disabled={loading || inputValue.trim().length < 3}>
          {loading ? "Searching…" : "Search"}
        </Button>
      </form>

      {showAllResults !== null && showAllResults.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {showAllResults.map((wo) => (
            <WOCard
              key={wo.WONo}
              wo={wo}
              onClick={() => router.push(`/work-orders/${wo.WONo}`)}
            />
          ))}
        </div>
      )}
      {showAllResults !== null && showAllResults.length === 0 && !loading && (
        <p className="text-slate-500 dark:text-slate-400">No work orders found.</p>
      )}
    </div>
  );
}

function WOCard({ wo, onClick }) {
  const statusStyles = {
    Open: "bg-cyan-50 border-cyan-200 text-cyan-700 dark:bg-cyan-950/50 dark:border-cyan-800 dark:text-cyan-300",
    Accepted:
      "bg-cyan-50 border-cyan-200 text-cyan-700 dark:bg-cyan-950/50 dark:border-cyan-800 dark:text-cyan-300",
    Quote:
      "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-300",
    Closed:
      "bg-slate-100 border-slate-300 text-slate-600 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-400",
    Rejected:
      "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/50 dark:border-red-800 dark:text-red-300",
  };
  const statusStyle = statusStyles[wo.DispositionText] ?? statusStyles.Closed;
  const equipmentText =
    wo.Make && wo.Model && wo.SerialNo
      ? [wo.Make, wo.Model, wo.SerialNo].filter(Boolean).join(", ")
      : "No equipment";
  const locationName = wo.Name || wo.ShipName;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:border-cyan-200 hover:shadow-lg dark:border-slate-700/50 dark:bg-slate-800/50 dark:hover:border-cyan-500/50"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-lg font-semibold text-slate-900 dark:text-white">
          #{wo.WONo}
        </span>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyle}`}
        >
          {wo.DispositionText || "N/A"}
        </span>
      </div>
      <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
        {locationName && <div className="truncate">{locationName}</div>}
        <div className="truncate">{equipmentText}</div>
      </div>
    </button>
  );
}
