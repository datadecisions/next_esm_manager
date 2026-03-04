"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Loader2, ChevronDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import {
  searchCustomerEquipment,
  searchEquipment,
} from "@/lib/api/equipment";

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

function itemDisplay(eq) {
  if (!eq) return "";
  const s = eq.SerialNo ?? eq.serialNo ?? "";
  const u = eq.UnitNo ?? eq.unitNo ?? "";
  const loc = eq.Location ?? eq.location ?? "";
  return `${s}: ${u} ${loc}`.trim() || `${s} · ${u}` || "Equipment";
}

export function EquipmentCombobox({
  value = [],
  onValueChange,
  placeholder = "Search equipment (type at least 3 characters)...",
  token,
  disabled,
  minChars = 3,
  shipTo,
  billTo,
  forceEnabled,
  sequenceMode = false,
}) {
  const items = Array.isArray(value) ? value : value ? [value] : [];
  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const hasCustomers = !!(shipTo?.Number ?? shipTo?.number) && !!(billTo?.Number ?? billTo?.number);
  const canSearch = forceEnabled || hasCustomers;
  const maxItems = sequenceMode ? 2 : Infinity;
  const atLimit = items.length >= maxItems;
  const selectedSerials = new Set(items.map((e) => e.SerialNo ?? e.serialNo ?? "").filter(Boolean));

  const performSearch = useCallback(
    async (query) => {
      if (!token || !query.trim() || query.trim().length < minChars) {
        setSearchResults([]);
        return;
      }
      setLoading(true);
      try {
        let data;
        if (hasCustomers) {
          const s = shipTo?.Number ?? shipTo?.number ?? "";
          const b = billTo?.Number ?? billTo?.number ?? "";
          data = await searchCustomerEquipment(query.trim(), s, b, token);
        } else {
          data = await searchEquipment(query.trim(), token);
        }
        setSearchResults(data);
      } catch {
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    },
    [token, minChars, hasCustomers, shipTo?.Number, shipTo?.number, billTo?.Number, billTo?.number]
  );

  const debouncedSearch = useDebounce(performSearch, 200);

  function handleInputChange(e) {
    const v = e.target.value;
    setInputText(v);
    if (canSearch && v.trim().length >= minChars && !atLimit) {
      setOpen(true);
      debouncedSearch(v);
    } else {
      setSearchResults([]);
      setOpen(false);
    }
  }

  function handleSelect(equipment) {
    const serial = equipment.SerialNo ?? equipment.serialNo;
    if (selectedSerials.has(serial)) return;
    if (sequenceMode && items.length >= 2) {
      onValueChange?.([items[1], equipment]);
    } else {
      onValueChange?.([...items, equipment]);
    }
    setInputText("");
    setSearchResults([]);
    setOpen(false);
  }

  function handleRemove(idx) {
    const next = items.filter((_, i) => i !== idx);
    onValueChange?.(next);
  }

  function handleFocus() {
    if (canSearch && !atLimit && inputText.trim().length >= minChars && searchResults.length > 0) {
      setOpen(true);
    }
  }

  const filteredResults = searchResults.filter(
    (eq) => !selectedSerials.has(eq.SerialNo ?? eq.serialNo ?? "")
  );
  const hasSearched = inputText.trim().length >= minChars;

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div
            className={`flex min-h-9 w-full flex-wrap items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50 dark:bg-input/30 ${
              disabled || !canSearch ? "cursor-not-allowed opacity-50" : ""
            }`}
          >
            {items.map((eq, idx) => (
              <span
                key={eq.SerialNo ?? eq.serialNo ?? idx}
                className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium"
              >
                {itemDisplay(eq)}
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(idx);
                    }}
                    className="ml-0.5 rounded p-0.5 hover:bg-muted-foreground/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))}
            {!atLimit && (
              <input
                ref={inputRef}
                value={inputText}
                onChange={handleInputChange}
                onFocus={handleFocus}
                placeholder={items.length === 0 ? placeholder : "Add more..."}
                disabled={disabled || !canSearch}
                className="min-w-24 flex-1 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
              />
            )}
            {!atLimit && <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
          </div>
        </PopoverAnchor>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] max-h-64 overflow-auto p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </div>
          ) : hasSearched ? (
            filteredResults.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                No equipment found.
              </div>
            ) : (
              <ul className="py-1">
                {filteredResults.map((eq) => (
                  <li key={eq.SerialNo ?? eq.serialNo ?? eq.ID ?? eq.id ?? Math.random()}>
                    <button
                      type="button"
                      className="flex w-full flex-col gap-0.5 px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
                      onClick={() => handleSelect(eq)}
                    >
                      <span className="font-medium">
                        S/N: {eq.SerialNo ?? eq.serialNo} | Unit: {eq.UnitNo ?? eq.unitNo ?? "—"}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {eq.Make ?? eq.make}: {eq.Model ?? eq.model}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <div className="py-4 text-center text-sm text-muted-foreground">
              {!canSearch
                ? "Select Ship To and Bill To customers first, or force enable."
                : `Type ${minChars}+ characters to search...`}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
