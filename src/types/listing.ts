export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  category: string;
  sellerId: string;
  sellerName: string;
  status: "active" | "sold" | "draft";
  createdAt: number;
  updatedAt: number;
}

export interface ListingFilters {
  search?: string;
  category?: string;
  sortBy?: "date" | "price-asc" | "price-desc";
  page: number;
  perPage: number;
}

export interface PaginatedListings {
  items: Listing[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}
