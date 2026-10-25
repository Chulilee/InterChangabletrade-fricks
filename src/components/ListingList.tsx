"use client";

import { useCallback, useEffect, useMemo, useState, startTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Listing, ListingFilters, PaginatedListings } from "@/types/listing";
import { getListings, getCategories } from "@/services/listingService";
import { ListingCard } from "@/components/ListingCard";
import { SearchBar } from "@/components/SearchBar";
import { FilterPanel } from "@/components/FilterPanel";

interface ListingListProps {
  onEdit?: (listing: Listing) => void;
  onFindMatches?: (listing: Listing) => void;
  refreshKey?: number;
}

const DEFAULT_FILTERS: ListingFilters = {
  search: "",
  category: "",
  tags: [],
  priceMin: undefined,
  priceMax: undefined,
  sortBy: "date",
  page: 1,
  perPage: 6,
};

function parseFiltersFromSearchParams(searchParams: URLSearchParams): ListingFilters {
  const tagsParam = searchParams.get("tags");
  const tags = tagsParam ? tagsParam.split(",").filter(Boolean) : [];

  return {
    search: searchParams.get("search") ?? "",
    category: searchParams.get("category") ?? "",
    tags: tags.length > 0 ? tags : [],
    priceMin: searchParams.get("priceMin")
      ? Number(searchParams.get("priceMin"))
      : undefined,
    priceMax: searchParams.get("priceMax")
      ? Number(searchParams.get("priceMax"))
      : undefined,
    sortBy: (searchParams.get("sortBy") as ListingFilters["sortBy"]) ?? "date",
    page: Number(searchParams.get("page")) || 1,
    perPage: Number(searchParams.get("perPage")) || 6,
  };
}

function filtersToSearchParams(f: ListingFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (f.search) params.set("search", f.search);
  if (f.category) params.set("category", f.category);
  if (f.tags?.length) params.set("tags", f.tags.join(","));
  if (f.priceMin !== undefined) params.set("priceMin", String(f.priceMin));
  if (f.priceMax !== undefined) params.set("priceMax", String(f.priceMax));
  if (f.sortBy) params.set("sortBy", f.sortBy);
  params.set("page", String(f.page));
  params.set("perPage", String(f.perPage));
  return params;
}

export function ListingList({ onEdit, onFindMatches, refreshKey }: ListingListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<ListingFilters>(() =>
    parseFiltersFromSearchParams(searchParams),
  );

  // Re-parse when the URL changes externally (e.g. back/forward navigation).
  useEffect(() => {
    setFilters(parseFiltersFromSearchParams(searchParams));
  }, [searchParams]);

  const categories = useMemo(() => getCategories(), []);
  

  const [data, setData] = useState<PaginatedListings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchListings = useCallback(async (f: ListingFilters) => {
    setLoading(true);
    try {
      const result = await getListings(f);
      setData(result);
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch whenever filters change and push the new query to the URL so the
  // current view is bookmarkable / shareable.
  useEffect(() => {
    void fetchListings(filters);
    startTransition(() => {
      router.replace(
        `?${filtersToSearchParams(filters).toString()}`,
        { scroll: false },
      );
    });
  }, [filters, fetchListings, router, refreshKey]);

  const totalPages = data?.totalPages ?? 1;

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    data?.items.forEach((item) => {
      item.tags.forEach((t) => tagSet.add(t));
    });
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const searchSuggestions = useMemo(() => {
    const q = filters.search.toLowerCase();
    if (!q) return [];
    const seen = new Set<string>();
    const suggestions: string[] = [];
    data?.items.forEach((item) => {
      if (item.title.toLowerCase().includes(q) && !seen.has(item.title)) {
        seen.add(item.title);
        suggestions.push(item.title);
      }
      item.tags
        .filter((t) => t.toLowerCase().includes(q))
        .forEach((t) => {
          if (!seen.has(t)) {
            seen.add(t);
            suggestions.push(t);
          }
        }
      );
    });
    return suggestions.slice(0, 5);
  }, [filters.search, data]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-3">
        <SearchBar
          value={filters.search}
          suggestions={searchSuggestions}
          onChange={(search) =>
            setFilters((f) => ({ ...f, search, page: 1 }))
          }
        />
        <FilterPanel
          filters={filters}
          allTags={allTags}
          onChange={(next) => setFilters(next)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-sky-600" />
        </div>
      ) : data && data.items.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onEdit={onEdit}
                onFindMatches={onFindMatches}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                type="button"
                disabled={filters.page <= 1}
                onClick={() =>
                  setFilters((f) => ({ ...f, page: f.page - 1 }))
                }
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-3 text-sm text-slate-500">
                Page {data.page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={filters.page >= totalPages}
                onClick={() =>
                  setFilters((f) => ({ ...f, page: f.page + 1 }))
                }
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}

          <p className="text-center text-xs text-slate-400">
            {data.total} listing{data.total !== 1 ? "s" : ""} found
          </p>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm font-medium text-slate-500">
            No listings match your search.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Try adjusting your filters or create a new listing.
          </p>
        </div>
      )}
    </div>
  );
}
