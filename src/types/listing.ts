export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  category: string;
  tags: string[];
  sellerId: string;
  sellerName: string;
  status: "active" | "sold" | "draft";
  createdAt: number;
  updatedAt: number;
}

/** A single match suggestion between two listings. */
export interface MatchSuggestion {
  /** The candidate listing being suggested. */
  listing: Listing;
  /** Overall relevance score from 0 to 100. */
  score: number;
  /** Breakdown of how the score was computed. */
  breakdown: {
    category: number;
    tags: number;
    value: number;
  };
  /** Human-readable reason why this is a good match. */
  reason: string;
}

/** The result of running match generation for a given listing. */
export interface TradeMatchResult {
  /** The source listing that matches were computed for. */
  source: Listing;
  /** Ranked list of match suggestions, highest score first. */
  suggestions: MatchSuggestion[];
  /** Timestamp of when matches were generated. */
  generatedAt: number;
}

export interface ListingFilters {
  search?: string;
  category?: string;
  sortBy?: "date" | "price-asc" | "price-desc";
  page: number;
  perPage: number;
}

/** Status of a trade proposal between two parties. */
export type TradeProposalStatus = "pending" | "accepted" | "declined" | "cancelled";

/** A trade proposal between two listings. */
export interface TradeProposal {
  id: string;
  sourceListingId: string;
  targetListingId: string;
  proposerId: string;
  message: string;
  status: TradeProposalStatus;
  createdAt: number;
}

export interface PaginatedListings {
  items: Listing[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}
