"use client";

import { useCallback, useState } from "react";
import type { Listing } from "@/types/listing";
import { useAuth } from "@/hooks/useAuth";
import { ListingList } from "@/components/ListingList";
import { ListingCreate } from "@/components/ListingCreate";
import { ListingEdit } from "@/components/ListingEdit";

export function MarketplaceClient() {
  const { isAuthenticated } = useAuth();
  const [view, setView] = useState<"list" | "create" | "edit">("list");
  const [editing, setEditing] = useState<Listing | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreated = useCallback(() => {
    setView("list");
    setRefreshKey((k) => k + 1);
  }, []);

  const handleEdit = useCallback((listing: Listing) => {
    setEditing(listing);
    setView("edit");
  }, []);

  const handleSaved = useCallback(() => {
    setView("list");
    setEditing(null);
    setRefreshKey((k) => k + 1);
  }, []);

  const handleCancel = useCallback(() => {
    setView("list");
    setEditing(null);
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

      {view === "list" && (
        <ListingList onEdit={isAuthenticated ? handleEdit : undefined} refreshKey={refreshKey} />
      )}
    </div>
  );
}
