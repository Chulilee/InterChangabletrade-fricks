"use client";

import type { Listing } from "@/types/listing";
import { formatCurrency } from "@/lib/format";

interface ListingCardProps {
  listing: Listing;
  onEdit?: (listing: Listing) => void;
  onFindMatches?: (listing: Listing) => void;
}

export function ListingCard({ listing, onEdit, onFindMatches }: ListingCardProps) {
  const date = new Date(listing.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="group block rounded-xl border border-slate-200 bg-white p-5 transition hover:border-sky-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-slate-900 group-hover:text-sky-600">
            {listing.title}
          </h3>
          <span className="mt-1 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
            {listing.category}
          </span>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
          Active
        </span>
      </div>

      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
        {listing.description}
      </p>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-xl font-bold text-slate-900">
            {formatCurrency(listing.price)}
          </p>
          <p className="text-xs text-slate-400">{listing.currency}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">{listing.sellerName}</p>
          <p className="text-xs text-slate-400">{date}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {onFindMatches && (
          <button
            type="button"
            onClick={() => onFindMatches(listing)}
            className="w-full rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
          >
            Find matches
          </button>
        )}
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(listing)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600"
          >
            Edit listing
          </button>
        )}
      </div>
    </div>
  );
}
