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
import { searchPurchaseOrders } from "@/lib/api/purchase-order";

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

function formatCurrency(n) {
  if (n == null || n === "") return "";
  const num = parseFloat(n);
  return isNaN(num) ? "" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}

export function PurchaseOrderSearchCombobox({
  value,
  onValueChange,
  onSelect,
  placeholder = "Search by PO #, vendor name...",
  token,
  disabled,
  minChars = 3,
  includeClosed = false,
}) {
  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const performSearch = useCallback(
    async (query) => {
      if (!token || !query.trim() || query.trim().length < minChars) {
        setItems([]);
        return;
      }
      setLoading(true);
      try {
        const data = await searchPurchaseOrders(query.trim(), includeClosed, token);
        setItems(data);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [token, minChars, includeClosed]
  );

  const debouncedSearch = useDebounce(performSearch, 300);

  function handleInputChange(e) {
    const v = e.target.value;
    setInputText(v);
    onValueChange?.(null);
    if (v.trim().length >= minChars) {
      setOpen(true);
      debouncedSearch(v);
    } else {
      setItems([]);
      setOpen(false);
    }
  }

  function handleSelect(po) {
    onSelect?.(po);
    onValueChange?.(po);
    setInputText(po ? `#${po.PONo} ${po.VendorName ?? ""}`.trim() : "");
    setOpen(false);
  }

  function handleClear(e) {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    onValueChange?.(null);
    setInputText("");
    setItems([]);
    setOpen(false);
    inputRef.current?.focus();
  }

  function handleFocus() {
    if (inputText.trim().length >= minChars && items.length > 0) {
      setOpen(true);
    }
  }

  const hasSearched = inputText.trim().length >= minChars;

  function handleGoDirect() {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSelect?.({ PONo: trimmed });
    setInputText("");
    setItems([]);
    setOpen(false);
  }

  return (
    <div className="relative flex w-full gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div className="relative flex flex-1">
            <Input
              ref={inputRef}
              value={inputText}
              onChange={handleInputChange}
              onFocus={handleFocus}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (items.length === 1) handleSelect(items[0]);
                  else if (inputText.trim()) handleGoDirect();
                }
              }}
              placeholder={placeholder}
              disabled={disabled}
              className="pr-16"
            />
            <div className="absolute inset-y-0 right-0 flex items-center">
              {value || inputText ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-full px-2"
                  onClick={(e) => { e.stopPropagation(); handleClear(e); }}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : (
                <ChevronDown className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
            </div>
          </div>
        </PopoverAnchor>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] max-h-72 overflow-auto p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </div>
          ) : hasSearched ? (
            items.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                No purchase orders found.
              </div>
            ) : (
              <ul className="py-1">
                {items.map((po) => (
                  <li key={po.PONo}>
                    <button
                      type="button"
                      className="flex w-full flex-col gap-0.5 px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
                      onClick={() => handleSelect(po)}
                    >
                      <span className="font-medium">
                        #{po.PONo} · {po.VendorName ?? ""}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {po.VendorAddress} · {po.VendorCity}, {po.VendorState} · {formatCurrency(po.amount ?? po.Amount)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <div className="py-4 text-center text-sm text-muted-foreground">
              Type {minChars}+ characters to search...
            </div>
          )}
        </PopoverContent>
      </Popover>
      <Button
        onClick={handleGoDirect}
        disabled={!inputText.trim() || disabled}
        variant="secondary"
        className="shrink-0"
      >
        Go
      </Button>
    </div>
  );
}
