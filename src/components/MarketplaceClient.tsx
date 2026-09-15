"use client";

import { useCallback, useState } from "react";
import type { Listing } from "@/types/listing";
import { useAuth } from "@/hooks/useAuth";
import { ListingList } from "@/components/ListingList";
import { ListingCreate } from "@/components/ListingCreate";
import { ListingEdit } from "@/components/ListingEdit";
import { SuggestedMatches } from "@/components/SuggestedMatches";
import { useAnalytics } from "@/hooks/useAnalytics";

export function MarketplaceClient() {
  const { isAuthenticated } = useAuth();
  const { track } = useAnalytics();
  const [view, setView] = useState<"list" | "create" | "edit" | "matches">("list");
  const [editing, setEditing] = useState<Listing | null>(null);
  const [matchListing, setMatchListing] = useState<Listing | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreated = useCallback(() => {
    setView("list");
    setRefreshKey((k) => k + 1);
  }, []);

  const handleEdit = useCallback((listing: Listing) => {
    setEditing(listing);
    setView("edit");
  }, []);

  const handleFindMatches = useCallback((listing: Listing) => {
    setMatchListing(listing);
    setView("matches");
    track("listing_view", { listing_id: listing.id, view: "matches" });
  }, [track]);

  const handleSaved = useCallback(() => {
    setView("list");
    setEditing(null);
    setRefreshKey((k) => k + 1);
  }, []);

  const handleCancel = useCallback(() => {
    setView("list");
    setEditing(null);
    setMatchListing(null);
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Marketplace
          </h1>
          <p className="mt-2 text-slate-500">
            Browse and trade tokenized assets on the InterChangableTrade
            network.
          </p>
        </div>
        {isAuthenticated && view === "list" && (
          <button
            type="button"
            onClick={() => setView("create")}
            className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500"
          >
            Create listing
          </button>
        )}
      </div>

      {view === "create" && (
        <ListingCreate onCreated={handleCreated} onCancel={handleCancel} />
      )}

      {view === "edit" && editing && (
        <ListingEdit
          listing={editing}
          onSaved={handleSaved}
          onCancel={handleCancel}
        />
      )}

      {view === "matches" && matchListing && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              ← Back to marketplace
            </button>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Matches for: {matchListing.title}
              </h2>
              <p className="text-sm text-slate-500">
                {matchListing.category} · {matchListing.sellerName}
              </p>
            </div>
          </div>
          <SuggestedMatches
            listing={matchListing}
            currentUserId="current_user"
          />
        </div>
      )}

      {view === "list" && (
        <ListingList
          onEdit={isAuthenticated ? handleEdit : undefined}
          onFindMatches={isAuthenticated ? handleFindMatches : undefined}
          refreshKey={refreshKey}
        />
      )}
    </div>
  );
}
