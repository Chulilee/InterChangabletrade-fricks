"use client";

import { useCallback, useEffect, useState } from "react";
import type { Listing, ListingFilters, PaginatedListings } from "@/types/listing";
import { getListings, getCategories } from "@/services/listingService";
import { ListingCard } from "@/components/ListingCard";

interface ListingListProps {
  onEdit?: (listing: Listing) => void;
  refreshKey?: number;
}

export function ListingList({ onEdit, refreshKey }: ListingListProps) {
  const [data, setData] = useState<PaginatedListings | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ListingFilters>({
    search: "",
    category: "",
    sortBy: "date",
    page: 1,
    perPage: 6,
  });

  const categories = getCategories();

  const fetchListings = useCallback(async (f: ListingFilters) => {
    setLoading(true);
    const result = await getListings(f);
    setData(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchListings(filters);
  }, [filters, fetchListings, refreshKey]);

  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Search listings..."
          value={filters.search ?? ""}
          onChange={(e) =>
            setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))
          }
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
        <select
          value={filters.category ?? ""}
          onChange={(e) =>
            setFilters((f) => ({ ...f, category: e.target.value, page: 1 }))
          }
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={filters.sortBy ?? "date"}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              sortBy: e.target.value as ListingFilters["sortBy"],
              page: 1,
            }))
          }
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        >
          <option value="date">Newest first</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
        </select>
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
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                type="button"
                disabled={filters.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
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
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
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
