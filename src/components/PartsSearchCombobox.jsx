"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ChevronDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { searchAllParts, searchParts } from "@/lib/api/parts";

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

export function PartsSearchCombobox({
  value,
  onValueChange,
  onSelect,
  placeholder = "Search by part #, description...",
  token,
  disabled,
  minChars = 3,
  searchAll = true,
  warehouse,
  /** When true, selecting a part does not navigate to part detail */
  selectOnly = false,
}) {
  const router = useRouter();
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
        const data = searchAll
          ? await searchAllParts(query.trim(), token)
          : await searchParts(query.trim(), warehouse, token);
        setItems(data);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [token, minChars, searchAll, warehouse]
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

  function handleSelect(part) {
    onSelect?.(part);
    onValueChange?.(part);
    setInputText(part ? `${part.PartNo} · ${part.Warehouse ?? ""}`.trim() : "");
    setOpen(false);
    if (part?.PartNo && !selectOnly) {
      const wh = part.Warehouse ?? "Main";
      router.push(`/parts/inventory/${encodeURIComponent(part.PartNo)}/${encodeURIComponent(wh)}`);
    }
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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear(e);
                  }}
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
                No parts found.
              </div>
            ) : (
              <ul className="py-1">
                {items.map((part) => (
                  <li key={`${part.PartNo}-${part.Warehouse ?? ""}`}>
                    <button
                      type="button"
                      className="flex w-full flex-col gap-0.5 px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
                      onClick={() => handleSelect(part)}
                    >
                      <span className="font-medium">
                        {part.PartNo}
                        {part.Warehouse ? (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            {part.Warehouse === "Main" ? "Main Warehouse" : part.Warehouse}
                          </span>
                        ) : null}
                      </span>
                      {part.Description ? (
                        <span className="text-xs text-muted-foreground truncate">
                          {part.Description}
                        </span>
                      ) : null}
                      {part.Vendor ? (
                        <span className="text-xs text-muted-foreground truncate">
                          Vendor: {part.Vendor}
                        </span>
                      ) : null}
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
