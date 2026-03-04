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
import { searchVendors } from "@/lib/api/vendor";

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

function itemDisplay(v) {
  if (!v) return "";
  return `${v.Name ?? v.name ?? ""} (#${v.VendorNo ?? v.vendorNo ?? ""})`.trim();
}

export function VendorCombobox({
  value,
  onValueChange,
  placeholder = "Search vendors...",
  token,
  disabled,
  minChars = 1,
}) {
  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState(itemDisplay(value));
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setInputText(itemDisplay(value));
  }, [value]);

  const performSearch = useCallback(
    async (query) => {
      if (!token || !query.trim() || query.trim().length < minChars) {
        setItems([]);
        return;
      }
      setLoading(true);
      try {
        const data = await searchVendors(query.trim(), token);
        setItems(data);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [token, minChars]
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

  function handleSelect(vendor) {
    onValueChange?.(vendor);
    setInputText(itemDisplay(vendor));
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

  const displayValue = value ? itemDisplay(value) : inputText;
  const hasSearched = inputText.trim().length >= minChars;

  return (
    <div className="relative flex w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div className="relative flex w-full">
            <Input
              ref={inputRef}
              value={displayValue}
              onChange={handleInputChange}
              onFocus={handleFocus}
              placeholder={placeholder}
              disabled={disabled}
              className="pr-16"
            />
            <div className="absolute inset-y-0 right-0 flex items-center">
              {value ? (
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
            items.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                No vendors found.
              </div>
            ) : (
              <ul className="py-1">
                {items.map((vendor) => (
                  <li key={vendor.VendorNo ?? vendor.vendorNo}>
                    <button
                      type="button"
                      className="flex w-full flex-col gap-0.5 px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
                      onClick={() => handleSelect(vendor)}
                    >
                      <span className="font-medium">
                        {vendor.Name ?? vendor.name} (#{vendor.VendorNo ?? vendor.vendorNo})
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {vendor.MailingAddress ?? vendor.Address} · {vendor.MailingCity ?? vendor.City}, {vendor.MailingState ?? vendor.State}
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
    </div>
  );
}
