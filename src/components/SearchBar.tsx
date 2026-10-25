"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Listing } from "@/types/listing";
import { getListings } from "@/services/listingService";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  suggestions?: string[];
}

/**
 * Search input with debounce and query suggestions.
 *
 * Keystrokes are debounced (300 ms) so the parent is not re-fetched on every
 * character. Suggestions are derived from the listings that match the current
 * query and are shown in a dropdown below the input.
 */
export function SearchBar({
  value,
  onChange,
  suggestions = [],
}: SearchBarProps) {
  const [inputValue, setInputValue] = useState(value);
  const [open, setOpen] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync the controlled value from the parent (e.g. URL state) into the input.
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      setInputValue(next);
      setOpen(next.length > 0);

      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        onChange(next);
      }, 300);
    },
    [onChange],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      onChange(inputValue);
      setOpen(false);
    },
    [inputValue, onChange],
  );

  const handleSelect = useCallback(
    (suggestion: string) => {
      setInputValue(suggestion);
      setOpen(false);
      onChange(suggestion);
    },
    [onChange],
  );

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  return (
    <div className="relative flex-1">
      <form onSubmit={handleSubmit} className="w-full">
        <label
          htmlFor="search-listings"
          className="sr-only"
        >
          Search listings
        </label>
        <input
          id="search-listings"
          type="text"
          value={inputValue}
          onChange={handleChange}
          onFocus={() => setOpen(inputValue.length > 0)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search listings…"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls="search-suggestions"
          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </form>

      {open && suggestions.length > 0 && (
        <ul
          id="search-suggestions"
          role="listbox"
          aria-label="Search suggestions"
          className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          {suggestions.map((suggestion) => (
            <li
              key={suggestion}
              role="option"
              aria-selected={suggestion === inputValue}
              onClick={() => handleSelect(suggestion)}
              onMouseEnter={() => {}}
              className="px-3 py-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-100 focus:outline-none focus:bg-slate-100"
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
