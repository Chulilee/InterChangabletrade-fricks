"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ListingFilters } from "@/types/listing";
import { getCategories } from "@/services/listingService";

interface FilterPanelProps {
  filters: ListingFilters;
  onChange: (filters: ListingFilters) => void;
  allTags: string[];
}

/**
 * Filter panel for the marketplace listing index.
 *
 * Provides multi-select category checkboxes, a price range slider, tag chips,
 * and a sort dropdown. All controls are keyboard-accessible and the panel is
 * responsive (stacks on small screens, side-by-side on larger ones).
 */
export function FilterPanel({
  filters,
  onChange,
  allTags,
}: FilterPanelProps) {
  const categories = getCategories();
  const [priceMin, setPriceMin] = useState<string | undefined>(
    filters.priceMin?.toString() ?? undefined,
  );
  const [priceMax, setPriceMax] = useState<string | undefined>(
    filters.priceMax?.toString() ?? undefined,
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(
    filters.tags ?? [],
  );

  const selectedCategory = filters.category ?? "";

  const toggleCategory = useCallback(
    (category: string) => {
      onChange((prev) => ({
        ...prev,
        category: prev.category === category ? undefined : category,
        page: 1,
      }));
    },
    [onChange],
  );

  const toggleTag = useCallback(
    (tag: string) => {
      onChange((prev) => {
        const tags = prev.tags.includes(tag)
          ? prev.tags.filter((t) => t !== tag)
          : [...prev.tags, tag];
        return { ...prev, tags, page: 1 };
      });
    },
    [onChange],
  );

  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange((prev) => ({
        ...prev,
        sortBy: e.target.value as ListingFilters["sortBy"],
        page: 1,
      }));
    },
    [onChange],
  );

  const handlePriceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const name = e.target.name;
      const value = e.target.value;
      const num = value === "" ? undefined : Number(value);
      onChange((prev) => ({
        ...prev,
        [name === "priceMin" ? "priceMin" : "priceMax"]: num,
        page: 1,
      }));
      if (name === "priceMin") setPriceMin(value);
      else setPriceMax(value);
    },
    [onChange],
  );

  // Sync external filter changes (e.g. from URL) into local price state.
  useEffect(() => {
    setPriceMin(filters.priceMin?.toString() ?? undefined);
    setPriceMax(filters.priceMax?.toString() ?? undefined);
    setSelectedTags(filters.tags ?? []);
  }, [filters.priceMin, filters.priceMax, filters.tags]);

  const filteredTags = useMemo(
    () =>
      allTags
        .slice()
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())),
    [allTags],
  );

  return (
    <section
      aria-label="Listing filters"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Category (multi-select via single select + tag chips below) */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="filter-category"
            className="text-sm font-semibold text-slate-900"
          >
            Category
          </label>
          <select
            id="filter-category"
            value={selectedCategory}
            onChange={(e) => toggleCategory(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div className="flex flex-col gap-2">
          <label htmlFor="filter-sort" className="text-sm font-semibold text-slate-900">
            Sort by
          </label>
          <select
            id="filter-sort"
            value={filters.sortBy ?? "date"}
            onChange={handleSortChange}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="date">Newest first</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </div>

        {/* Price min */}
        <div className="flex flex-col gap-2">
          <label htmlFor="filter-price-min" className="text-sm font-semibold text-slate-900">
            Min price
          </label>
          <input
            id="filter-price-min"
            type="number"
            name="priceMin"
            min="0"
            step="0.01"
            value={priceMin ?? ""}
            onChange={handlePriceChange}
            placeholder="0"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        {/* Price max */}
        <div className="flex flex-col gap-2">
          <label htmlFor="filter-price-max" className="text-sm font-semibold text-slate-900">
            Max price
          </label>
          <input
            id="filter-price-max"
            type="number"
            name="priceMax"
            min="0"
            step="0.01"
            value={priceMax ?? ""}
            onChange={handlePriceChange}
            placeholder="∞"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Tags */}
      <div className="mt-4 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <label
            htmlFor="filter-tags"
            className="text-sm font-semibold text-slate-900"
          >
            Tags
          </label>
          <button
            type="button"
            onClick={() => {
              onChange((prev) => ({
                ...prev,
                tags: [],
                page: 1,
              }));
              setSelectedTags([]);
            }}
            disabled={selectedTags.length === 0}
            className="text-xs text-sky-600 hover:underline"
          >
            Clear all
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {filteredTags.map((tag) => {
            const active = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                role="checkbox"
                aria-checked={active}
                onClick={() => toggleTag(tag)}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  active
                    ? "bg-sky-100 text-sky-700 border border-sky-200"
                    : "bg-slate-100 text-slate-600 border border-transparent hover:bg-slate-200"
                }`}
              >
                {tag}
                {active && (
                  <span className="ml-1 text-sky-600">✕</span>
                )}
              </button>
            );
          })}
          {filteredTags.length === 0 && (
            <span className="text-xs text-slate-400 italic">No tags available</span>
          )}
        </div>
      </div>
    </section>
  );
}
