import { getListings } from "../listingService";
import type { ListingFilters } from "@/types/listing";

const baseFilters: ListingFilters = {
  search: "",
  category: "",
  tags: [],
  sortBy: "date",
  page: 1,
  perPage: 6,
};

async function fetch(filters: ListingFilters) {
  return getListings(filters);
}

describe("listingService filtering", () => {
  it("filters by category", async () => {
    const result = await fetch({ ...baseFilters, category: "Commodities" });
    expect(result.items.every((i) => i.category === "Commodities")).toBe(true);
    expect(result.items.length).toBeGreaterThan(0);
  });

  it("filters by tags", async () => {
    const result = await fetch({ ...baseFilters, tags: ["gold"] });
    expect(result.items.length).toBeGreaterThan(0);
    expect(
      result.items.every((i) => i.tags.some((t) => t.toLowerCase() === "gold")),
    ).toBe(true);
  });

  it("filters by price range", async () => {
    const result = await fetch({
      ...baseFilters,
      priceMin: 1000,
      priceMax: 2000,
    });
    expect(result.items.length).toBeGreaterThan(0);
    expect(
      result.items.every((i) => i.price >= 1000 && i.price <= 2000),
    ).toBe(true);
  });

  it("excludes items outside the price range", async () => {
    const result = await fetch({
      ...baseFilters,
      priceMin: 100_000,
      priceMax: 200_000,
    });
    expect(result.items.every((i) => i.price >= 100_000)).toBe(true);
    expect(
      result.items.every((i) => i.price <= 200_000),
    ).toBe(true);
  });

  it("sorts by price ascending", async () => {
    const result = await fetch({ ...baseFilters, sortBy: "price-asc" });
    const prices = result.items.map((i) => i.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it("sorts by price descending", async () => {
    const result = await fetch({ ...baseFilters, sortBy: "price-desc" });
    const prices = result.items.map((i) => i.price);
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
  });

  it("paginates results", async () => {
    const page1 = await fetch({ ...baseFilters, page: 1, perPage: 2 });
    const page2 = await fetch({ ...baseFilters, page: 2, perPage: 2 });
    expect(page1.items.length).toBeLessThanOrEqual(2);
    expect(page2.page).toBe(2);
    // Pages should not overlap when there are enough items.
    if (page1.items.length === 2 && page2.items.length === 2) {
      const ids1 = new Set(page1.items.map((i) => i.id));
      page2.items.forEach((i) => expect(ids1.has(i.id)).toBe(false));
    }
  });

  it("searches by keyword", async () => {
    const result = await fetch({ ...baseFilters, search: "gold" });
    expect(result.items.length).toBeGreaterThan(0);
    expect(
      result.items.every(
        (i) =>
          i.title.toLowerCase().includes("gold") ||
          i.description.toLowerCase().includes("gold"),
      ),
    ).toBe(true);
  });
});
