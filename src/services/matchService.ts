"use client";

import type {
  Listing,
  MatchSuggestion,
  TradeMatchResult,
  TradeProposal,
} from "@/types/listing";

// ---------------------------------------------------------------------------
// Matching weights — tunable constants that control scoring balance
// ---------------------------------------------------------------------------

/** Weight for category match (0–40 points). */
const CATEGORY_WEIGHT = 40;
/** Weight for tag overlap (0–35 points). */
const TAG_WEIGHT = 35;
/** Weight for price-range proximity (0–25 points). */
const VALUE_WEIGHT = 25;

/** Maximum number of suggestions returned. */
const MAX_SUGGESTIONS = 10;

/** Minimum score threshold for a match to be surfaced. */
const MIN_SCORE = 15;

// ---------------------------------------------------------------------------
// Scoring helpers
// ---------------------------------------------------------------------------

/**
 * Score how well two listings match in category.
 * Returns a value between 0 and CATEGORY_WEIGHT.
 */
export function scoreCategory(a: Listing, b: Listing): number {
  if (a.category === b.category) return CATEGORY_WEIGHT;
  const aWords = a.category.toLowerCase().split(/\s+/);
  const bWords = b.category.toLowerCase().split(/\s+/);
  const shared = aWords.filter((w) => bWords.includes(w));
  if (shared.length > 0) return Math.round(CATEGORY_WEIGHT * 0.5);
  return 0;
}

/**
 * Score tag overlap between two listings using Jaccard-inspired metric.
 * Returns a value between 0 and TAG_WEIGHT.
 */
export function scoreTags(a: Listing, b: Listing): number {
  const tagsA = new Set(a.tags.map((t) => t.toLowerCase()));
  const tagsB = new Set(b.tags.map((t) => t.toLowerCase()));
  if (tagsA.size === 0 && tagsB.size === 0) return 0;

  let overlap = 0;
  for (const tag of tagsA) {
    if (tagsB.has(tag)) overlap++;
  }

  const union = new Set([...tagsA, ...tagsB]).size;
  if (union === 0) return 0;

  const jaccard = overlap / union;
  return Math.round(jaccard * TAG_WEIGHT);
}

/**
 * Score how close two listings are in value.
 * Listings within 20% of each other get full marks; further apart = less.
 * Returns a value between 0 and VALUE_WEIGHT.
 */
export function scoreValue(a: Listing, b: Listing): number {
  const avg = (a.price + b.price) / 2;
  if (avg === 0) return 0;
  const diff = Math.abs(a.price - b.price);
  const ratio = diff / avg;

  if (ratio <= 0.05) return VALUE_WEIGHT;
  if (ratio >= 0.5) return 0;

  return Math.round(VALUE_WEIGHT * (1 - (ratio - 0.05) / 0.45));
}

/**
 * Build a human-readable reason string for a match suggestion.
 */
function buildReason(
  categoryScore: number,
  tagScore: number,
  valueScore: number,
  overlapTags: string[],
): string {
  const parts: string[] = [];

  if (categoryScore === CATEGORY_WEIGHT) {
    parts.push("same category");
  } else if (categoryScore > 0) {
    parts.push("related category");
  }

  if (overlapTags.length > 0) {
    const displayed = overlapTags.slice(0, 3).join(", ");
    parts.push(
      overlapTags.length > 3
        ? `${overlapTags.length} shared tags (${displayed}, …)`
        : `${overlapTags.length} shared tag${overlapTags.length > 1 ? "s" : ""} (${displayed})`,
    );
  }

  if (valueScore >= VALUE_WEIGHT * 0.8) {
    parts.push("similar value");
  } else if (valueScore > 0) {
    parts.push("comparable value range");
  }

  return parts.length > 0 ? parts.join(" · ") : "limited overlap";
}

// ---------------------------------------------------------------------------
// Core matching function
// ---------------------------------------------------------------------------

/**
 * Generate ranked match suggestions for a given listing.
 *
 * The algorithm scores each candidate listing on three dimensions:
 *   1. Category match (40 pts) — exact or related category
 *   2. Tag overlap   (35 pts) — Jaccard similarity of tag sets
 *   3. Value proximity(25 pts) — price-range closeness
 *
 * This is a lightweight frontend algorithm suitable for typical marketplace
 * dataset sizes (hundreds to low thousands of listings). For larger datasets,
 * the same scoring logic could be moved to a backend API with indexing.
 */
export function findMatches(
  source: Listing,
  candidates: Listing[],
): TradeMatchResult {
  const suggestions: MatchSuggestion[] = [];

  for (const candidate of candidates) {
    if (candidate.id === source.id) continue;
    if (candidate.status !== "active") continue;
    if (candidate.sellerId === source.sellerId) continue;

    const categoryScore = scoreCategory(source, candidate);
    const tagScore = scoreTags(source, candidate);
    const valueScore = scoreValue(source, candidate);
    const score = categoryScore + tagScore + valueScore;

    if (score < MIN_SCORE) continue;

    const tagsA = new Set(source.tags.map((t) => t.toLowerCase()));
    const tagsB = new Set(candidate.tags.map((t) => t.toLowerCase()));
    const overlapTags = [...tagsA].filter((t) => tagsB.has(t));

    suggestions.push({
      listing: candidate,
      score,
      breakdown: { category: categoryScore, tags: tagScore, value: valueScore },
      reason: buildReason(categoryScore, tagScore, valueScore, overlapTags),
    });
  }

  suggestions.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (
      Math.abs(a.listing.price - source.price) -
      Math.abs(b.listing.price - source.price)
    );
  });

  return {
    source,
    suggestions: suggestions.slice(0, MAX_SUGGESTIONS),
    generatedAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Trade proposal management (localStorage-backed)
// ---------------------------------------------------------------------------

const PROPOSALS_KEY = "ict.trade_proposals";

function generateProposalId(): string {
  return `prop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getAllProposals(): TradeProposal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PROPOSALS_KEY);
    return raw ? (JSON.parse(raw) as TradeProposal[]) : [];
  } catch {
    return [];
  }
}

function saveAllProposals(proposals: TradeProposal[]): void {
  window.localStorage.setItem(PROPOSALS_KEY, JSON.stringify(proposals));
}

/** Create a new trade proposal. */
export async function proposeTrade(
  sourceListingId: string,
  targetListingId: string,
  proposerId: string,
  message: string,
): Promise<TradeProposal> {
  await new Promise((r) => setTimeout(r, 200));
  const proposal: TradeProposal = {
    id: generateProposalId(),
    sourceListingId,
    targetListingId,
    proposerId,
    message,
    status: "pending",
    createdAt: Date.now(),
  };
  const all = getAllProposals();
  all.unshift(proposal);
  saveAllProposals(all);
  return proposal;
}

/** Accept a trade proposal. */
export async function acceptProposal(
  proposalId: string,
): Promise<TradeProposal | null> {
  await new Promise((r) => setTimeout(r, 200));
  const all = getAllProposals();
  const idx = all.findIndex((p) => p.id === proposalId);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], status: "accepted" };
  saveAllProposals(all);
  return all[idx];
}

/** Decline a trade proposal. */
export async function declineProposal(
  proposalId: string,
): Promise<TradeProposal | null> {
  await new Promise((r) => setTimeout(r, 200));
  const all = getAllProposals();
  const idx = all.findIndex((p) => p.id === proposalId);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], status: "declined" };
  saveAllProposals(all);
  return all[idx];
}

/** Get all proposals involving a given listing. */
export async function getProposalsForListing(
  listingId: string,
): Promise<TradeProposal[]> {
  await new Promise((r) => setTimeout(r, 100));
  return getAllProposals().filter(
    (p) =>
      p.sourceListingId === listingId || p.targetListingId === listingId,
  );
}
