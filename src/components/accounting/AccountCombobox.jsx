"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { getAccounts } from "@/lib/api/accounting";
import { formatAccountDisplay } from "@/lib/format";

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

export function AccountCombobox({
  value,
  onValueChange,
  placeholder = "Search accounts...",
  token,
  disabled,
  minChars = 0,
}) {
  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState(formatAccountDisplay(value));
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setInputText(formatAccountDisplay(value));
  }, [value]);

  const performSearch = useCallback(
    async (query) => {
      if (!token) {
        setItems([]);
        return;
      }
      setLoading(true);
      try {
        const data = await getAccounts(query?.trim() || "", token);
        setItems(Array.isArray(data) ? data : []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  const debouncedSearch = useDebounce(performSearch, 250);

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

  function handleSelect(account) {
    onValueChange?.(account);
    setInputText(formatAccountDisplay(account));
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
    if (inputText.trim().length >= minChars) {
      setOpen(true);
      if (items.length === 0 && !loading) performSearch(inputText);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="relative">
          <Input
            ref={inputRef}
            value={inputText}
            onChange={handleInputChange}
            onFocus={handleFocus}
            placeholder={placeholder}
            disabled={disabled}
            className="pr-8"
          />
          {loading && (
            <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] max-h-64 overflow-auto p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="p-1">
          {items.length === 0 && !loading && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              {inputText.trim().length < minChars
                ? `Type ${minChars} or more characters`
                : "No accounts found"}
            </div>
          )}
          {items.map((acc) => (
            <button
              key={acc.AccountNo}
              type="button"
              className="w-full text-left px-3 py-2 text-sm rounded hover:bg-accent focus:bg-accent focus:outline-none"
              onClick={() => handleSelect(acc)}
            >
              <span className="font-medium">{acc.AccountNo}</span>
              {acc.Description && (
                <span className="text-muted-foreground ml-2">
                  {acc.Description}
                </span>
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
