import type { Listing } from "@/types/listing";
import {
  scoreCategory,
  scoreTags,
  scoreValue,
  findMatches,
} from "@/services/matchService";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "listing_test_1",
    title: "Test Listing",
    description: "A test listing for unit tests.",
    price: 10_000,
    currency: "USDC",
    images: [],
    category: "Commodities",
    tags: ["gold", "bullion"],
    sellerId: "seller_1",
    sellerName: "TestSeller",
    status: "active",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// scoreCategory
// ---------------------------------------------------------------------------

describe("scoreCategory", () => {
  it("returns full score for identical categories", () => {
    const a = makeListing({ category: "Commodities" });
    const b = makeListing({ category: "Commodities" });
    expect(scoreCategory(a, b)).toBe(40);
  });

  it("returns half score for related categories sharing a keyword", () => {
    const a = makeListing({ category: "Digital Assets" });
    const b = makeListing({ category: "Digital Collectibles" });
    expect(scoreCategory(a, b)).toBe(20);
  });

  it("returns zero for completely different categories", () => {
    const a = makeListing({ category: "Real Estate" });
    const b = makeListing({ category: "Equity" });
    expect(scoreCategory(a, b)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// scoreTags
// ---------------------------------------------------------------------------

describe("scoreTags", () => {
  it("returns full score when all tags overlap", () => {
    const a = makeListing({ tags: ["gold", "bullion"] });
    const b = makeListing({ tags: ["gold", "bullion"] });
    expect(scoreTags(a, b)).toBe(35);
  });

  it("returns partial score for partial overlap", () => {
    const a = makeListing({ tags: ["gold", "bullion", "precious"] });
    const b = makeListing({ tags: ["gold", "silver"] });
    // Jaccard: overlap=1, union=4 → 1/4 * 35 ≈ 8.75 → rounded to 9
    expect(scoreTags(a, b)).toBe(9);
  });

  it("returns zero for no overlap", () => {
    const a = makeListing({ tags: ["gold"] });
    const b = makeListing({ tags: ["silver"] });
    expect(scoreTags(a, b)).toBe(0);
  });

  it("returns zero when both have empty tags", () => {
    const a = makeListing({ tags: [] });
    const b = makeListing({ tags: [] });
    expect(scoreTags(a, b)).toBe(0);
  });

  it("handles case-insensitive tag matching", () => {
    const a = makeListing({ tags: ["Gold"] });
    const b = makeListing({ tags: ["gold"] });
    expect(scoreTags(a, b)).toBe(35);
  });
});

// ---------------------------------------------------------------------------
// scoreValue
// ---------------------------------------------------------------------------

describe("scoreValue", () => {
  it("returns full score for very close prices (within 5%)", () => {
    const a = makeListing({ price: 10_000 });
    const b = makeListing({ price: 10_200 });
    expect(scoreValue(a, b)).toBe(25);
  });

  it("returns zero for prices 50%+ apart", () => {
    const a = makeListing({ price: 10_000 });
    const b = makeListing({ price: 20_000 });
    expect(scoreValue(a, b)).toBe(0);
  });

  it("returns partial score for moderately different prices", () => {
    const a = makeListing({ price: 10_000 });
    const b = makeListing({ price: 12_000 });
    const score = scoreValue(a, b);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(25);
  });

  it("returns zero when both prices are zero", () => {
    const a = makeListing({ price: 0 });
    const b = makeListing({ price: 0 });
    expect(scoreValue(a, b)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// findMatches
// ---------------------------------------------------------------------------

describe("findMatches", () => {
  const source = makeListing({
    id: "source_1",
    title: "Gold Bar",
    category: "Commodities",
    tags: ["gold", "bullion", "precious-metal"],
    price: 2_400,
    sellerId: "seller_source",
  });

  const candidates = [
    makeListing({
      id: "candidate_1",
      title: "Silver Bar",
      category: "Commodities",
      tags: ["silver", "bullion", "precious-metal"],
      price: 2_500,
      sellerId: "seller_a",
    }),
    makeListing({
      id: "candidate_2",
      title: "Downtown Apartment",
      category: "Real Estate",
      tags: ["apartment", "urban"],
      price: 150_000,
      sellerId: "seller_b",
    }),
    makeListing({
      id: "candidate_3",
      title: "Platinum Coin",
      category: "Commodities",
      tags: ["platinum", "precious-metal", "coin"],
      price: 2_800,
      sellerId: "seller_c",
    }),
    makeListing({
      id: "same_seller",
      title: "My Other Gold",
      category: "Commodities",
      tags: ["gold", "bullion"],
      price: 2_300,
      sellerId: "seller_source",
    }),
    makeListing({
      id: "inactive_listing",
      title: "Sold Item",
      category: "Commodities",
      tags: ["gold"],
      price: 2_400,
      sellerId: "seller_d",
      status: "sold",
    }),
  ];

  it("excludes the source listing itself", () => {
    const result = findMatches(source, [source, ...candidates]);
    expect(result.suggestions.find((s) => s.listing.id === "source_1")).toBeUndefined();
  });

  it("excludes listings from the same seller", () => {
    const result = findMatches(source, candidates);
    expect(result.suggestions.find((s) => s.listing.id === "same_seller")).toBeUndefined();
  });

  it("excludes inactive listings", () => {
    const result = findMatches(source, candidates);
    expect(result.suggestions.find((s) => s.listing.id === "inactive_listing")).toBeUndefined();
  });

  it("ranks the silver bar highest (same category + shared tags + similar value)", () => {
    const result = findMatches(source, candidates);
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions[0].listing.id).toBe("candidate_1");
  });

  it("includes the platinum coin as a match (same category + shared tag)", () => {
    const result = findMatches(source, candidates);
    const platinum = result.suggestions.find((s) => s.listing.id === "candidate_3");
    expect(platinum).toBeDefined();
    expect(platinum!.score).toBeGreaterThan(0);
  });

  it("does not include the apartment (different category, no tags, different value)", () => {
    const result = findMatches(source, candidates);
    expect(result.suggestions.find((s) => s.listing.id === "candidate_2")).toBeUndefined();
  });

  it("returns suggestions sorted by score descending", () => {
    const result = findMatches(source, candidates);
    const scores = result.suggestions.map((s) => s.score);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
    }
  });

  it("populates breakdown scores that sum to the total score", () => {
    const result = findMatches(source, candidates);
    for (const s of result.suggestions) {
      expect(s.breakdown.category + s.breakdown.tags + s.breakdown.value).toBe(s.score);
    }
  });

  it("generates a non-empty reason string", () => {
    const result = findMatches(source, candidates);
    for (const s of result.suggestions) {
      expect(s.reason.length).toBeGreaterThan(0);
    }
  });

  it("returns empty suggestions when no candidates match threshold", () => {
    const oddSource = makeListing({
      id: "odd",
      category: "Unique Niche",
      tags: ["xyzzy"],
      price: 500,
      sellerId: "seller_odd",
    });
    const result = findMatches(oddSource, [
      makeListing({
        id: "far_away",
        category: "Something Else",
        tags: ["unrelated"],
        price: 999_999,
        sellerId: "seller_z",
      }),
    ]);
    expect(result.suggestions.length).toBe(0);
  });

  it("sets source and generatedAt on the result", () => {
    const result = findMatches(source, candidates);
    expect(result.source).toBe(source);
    expect(result.generatedAt).toBeGreaterThan(0);
  });
});
