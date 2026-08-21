"use client";

import type {
  Listing,
  ListingFilters,
  PaginatedListings,
} from "@/types/listing";

const STORAGE_KEY = "ict.listings";

const CATEGORIES = [
  "Real Estate",
  "Commodities",
  "Equity",
  "Collectibles",
  "Digital Assets",
];

function generateId(): string {
  return `listing_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getAll(): Listing[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Listing[]) : [];
  } catch {
    return [];
  }
}

function saveAll(listings: Listing[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
}

function seedIfEmpty(): void {
  const existing = getAll();
  if (existing.length > 0) return;

  const seeds: Listing[] = [
    {
      id: generateId(),
      title: "Downtown Loft - Stellar Heights",
      description:
        "Premium loft apartment token in the Stellar Heights district. 2BR/1BA, 950 sqft with panoramic city views.",
      price: 125_000,
      currency: "USDC",
      images: [],
      category: "Real Estate",
      sellerId: "seller_1",
      sellerName: "StellarRealty",
      status: "active",
      createdAt: Date.now() - 86400000 * 2,
      updatedAt: Date.now() - 86400000 * 2,
    },
    {
      id: generateId(),
      title: "1 oz Gold Bar (PAMP Suisse)",
      description:
        "Tokenized 1 troy ounce gold bar, fully allocated and audited. Redeemable for physical delivery.",
      price: 2_385,
      currency: "USDC",
      images: [],
      category: "Commodities",
      sellerId: "seller_2",
      sellerName: "GoldVaultDAO",
      status: "active",
      createdAt: Date.now() - 86400000 * 5,
      updatedAt: Date.now() - 86400000 * 5,
    },
    {
      id: generateId(),
      title: "Acme Corp - 500 Shares",
      description:
        "Fractional equity token representing 500 shares of Acme Corp common stock.",
      price: 64_375,
      currency: "USDC",
      images: [],
      category: "Equity",
      sellerId: "seller_3",
      sellerName: "TradeBlock",
      status: "active",
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now() - 86400000,
    },
    {
      id: generateId(),
      title: "Genesis NFT Collection #42",
      description:
        "Rare digital collectible from the InterChangableTrade Genesis series. Includes voting rights.",
      price: 850,
      currency: "USDC",
      images: [],
      category: "Digital Assets",
      sellerId: "seller_4",
      sellerName: "CryptoGallery",
      status: "active",
      createdAt: Date.now() - 3600000 * 6,
      updatedAt: Date.now() - 3600000 * 6,
    },
    {
      id: generateId(),
      title: "Vintage Watch - Limited Edition",
      description:
        "Tokenized ownership of a rare vintage timepiece held in secure custody in Zurich.",
      price: 15_200,
      currency: "USDC",
      images: [],
      category: "Collectibles",
      sellerId: "seller_5",
      sellerName: "ChronoVault",
      status: "active",
      createdAt: Date.now() - 86400000 * 3,
      updatedAt: Date.now() - 86400000 * 3,
    },
  ];

  saveAll(seeds);
}

export async function getListings(
  filters: ListingFilters,
): Promise<PaginatedListings> {
  await new Promise((r) => setTimeout(r, 150));
  seedIfEmpty();

  let items = getAll().filter((l) => l.status === "active");

  if (filters.search) {
    const q = filters.search.toLowerCase();
    items = items.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q),
    );
  }

  if (filters.category) {
    items = items.filter((l) => l.category === filters.category);
  }

  if (filters.sortBy === "price-asc") {
    items.sort((a, b) => a.price - b.price);
  } else if (filters.sortBy === "price-desc") {
    items.sort((a, b) => b.price - a.price);
  } else {
    items.sort((a, b) => b.createdAt - a.createdAt);
  }

  const total = items.length;
  const start = (filters.page - 1) * filters.perPage;
  const paged = items.slice(start, start + filters.perPage);

  return {
    items: paged,
    total,
    page: filters.page,
    perPage: filters.perPage,
    totalPages: Math.ceil(total / filters.perPage),
  };
}

export async function getListing(id: string): Promise<Listing | null> {
  await new Promise((r) => setTimeout(r, 100));
  seedIfEmpty();
  return getAll().find((l) => l.id === id) ?? null;
}

export async function createListing(
  input: Omit<Listing, "id" | "createdAt" | "updatedAt">,
): Promise<Listing> {
  await new Promise((r) => setTimeout(r, 200));
  const now = Date.now();
  const listing: Listing = {
    ...input,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  const all = getAll();
  all.unshift(listing);
  saveAll(all);
  return listing;
}

export async function updateListing(
  id: string,
  input: Partial<Pick<Listing, "title" | "description" | "price" | "category" | "images" | "status">>,
): Promise<Listing | null> {
  await new Promise((r) => setTimeout(r, 200));
  const all = getAll();
  const idx = all.findIndex((l) => l.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...input, updatedAt: Date.now() };
  saveAll(all);
  return all[idx];
}

export async function deleteListing(id: string): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 150));
  const all = getAll();
  const filtered = all.filter((l) => l.id !== id);
  if (filtered.length === all.length) return false;
  saveAll(filtered);
  return true;
}

export function getCategories(): string[] {
  return CATEGORIES;
}
