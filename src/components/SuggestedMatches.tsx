"use client";

import { useCallback, useEffect, useState } from "react";
import type { Listing, MatchSuggestion, TradeMatchResult } from "@/types/listing";
import { findMatches, proposeTrade } from "@/services/matchService";
import { getListings } from "@/services/listingService";
import { formatCurrency } from "@/lib/format";
import { useAnalytics } from "@/hooks/useAnalytics";

interface SuggestedMatchesProps {
  listing: Listing;
  currentUserId?: string;
}

function scoreColor(score: number): string {
  if (score >= 70) return "bg-emerald-100 text-emerald-700";
  if (score >= 45) return "bg-sky-100 text-sky-700";
  return "bg-slate-100 text-slate-600";
}

function scoreBarWidth(score: number): string {
  return `${Math.min(100, Math.max(0, score))}%`;
}

function MatchCard({
  suggestion,
  onPropose,
  proposing,
}: {
  suggestion: MatchSuggestion;
  onPropose: (listing: Listing) => void;
  proposing: boolean;
}) {
  const { listing, score, breakdown, reason } = suggestion;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-sky-300 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="truncate font-semibold text-slate-900">
            {listing.title}
          </h4>
          <span className="mt-1 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
            {listing.category}
          </span>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${scoreColor(score)}`}
        >
          {score}
        </span>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-sky-500 transition-all duration-500"
          style={{ width: scoreBarWidth(score) }}
        />
      </div>
      <div className="mt-1.5 flex gap-3 text-[11px] text-slate-400">
        <span>Category: {breakdown.category}</span>
        <span>Tags: {breakdown.tags}</span>
        <span>Value: {breakdown.value}</span>
      </div>

      <p className="mt-2 text-xs text-slate-500">{reason}</p>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <p className="text-lg font-bold text-slate-900">
            {formatCurrency(listing.price)}
          </p>
          <p className="text-xs text-slate-400">{listing.sellerName}</p>
        </div>
        <button
          type="button"
          onClick={() => onPropose(listing)}
          disabled={proposing}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:opacity-60"
        >
          {proposing ? "Proposing..." : "Propose trade"}
        </button>
      </div>
    </div>
  );
}

export function SuggestedMatches({
  listing,
  currentUserId = "current_user",
}: SuggestedMatchesProps) {
  const { track } = useAnalytics();
  const [result, setResult] = useState<TradeMatchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [proposingId, setProposingId] = useState<string | null>(null);
  const [proposalMessage, setProposalMessage] = useState("");
  const [showMessageFor, setShowMessageFor] = useState<string | null>(null);
  const [proposedIds, setProposedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { items } = await getListings({
        page: 1,
        perPage: 100,
        sortBy: "date",
      });
      if (!cancelled) {
        const matchResult = findMatches(listing, items);
        setResult(matchResult);
        setLoading(false);

        track("listing_view", {
          listing_id: listing.id,
          matches_count: matchResult.suggestions.length,
        });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [listing, track]);

  const handlePropose = useCallback(
    (targetListing: Listing) => {
      setShowMessageFor(targetListing.id);
      setProposalMessage("");
    },
    [],
  );

  const handleSubmitProposal = useCallback(
    async (targetListing: Listing) => {
      setProposingId(targetListing.id);
      try {
        await proposeTrade(
          listing.id,
          targetListing.id,
          currentUserId,
          proposalMessage.trim() || `I'd like to trade for ${listing.title}`,
        );

        track("match_propose", {
          source_listing_id: listing.id,
          target_listing_id: targetListing.id,
          source_seller_id: listing.sellerId,
          target_seller_id: targetListing.sellerId,
        });

        setProposedIds((prev) => new Set([...prev, targetListing.id]));
        setShowMessageFor(null);
        setProposalMessage("");
      } finally {
        setProposingId(null);
      }
    },
    [listing, currentUserId, proposalMessage, track],
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-sky-600" />
        <p className="mt-2 text-sm text-slate-400">Finding matches...</p>
      </div>
    );
  }

  if (!result || result.suggestions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
        <p className="text-sm font-medium text-slate-500">
          No matches found
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Try adding more tags to your listing to improve matching.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">
          Suggested Matches
        </h3>
        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
          {result.suggestions.length} found
        </span>
      </div>

      <p className="text-sm text-slate-500">
        Ranked by category, tag overlap, and value proximity.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {result.suggestions.map((suggestion) => (
          <div key={suggestion.listing.id}>
            {showMessageFor === suggestion.listing.id ? (
              <div className="rounded-xl border border-sky-300 bg-sky-50/50 p-4">
                <p className="mb-2 text-sm font-medium text-slate-700">
                  Send a message with your proposal
                </p>
                <textarea
                  value={proposalMessage}
                  onChange={(e) => setProposalMessage(e.target.value)}
                  placeholder={`I'd like to trade for ${suggestion.listing.title}...`}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSubmitProposal(suggestion.listing)}
                    disabled={proposingId === suggestion.listing.id}
                    className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:opacity-60"
                  >
                    {proposingId === suggestion.listing.id
                      ? "Sending..."
                      : "Send proposal"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMessageFor(null);
                      setProposalMessage("");
                    }}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : proposedIds.has(suggestion.listing.id) ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-center">
                <p className="text-sm font-medium text-emerald-700">
                  ✓ Proposal sent to {suggestion.listing.sellerName}
                </p>
              </div>
            ) : (
              <MatchCard
                suggestion={suggestion}
                onPropose={handlePropose}
                proposing={proposingId === suggestion.listing.id}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
