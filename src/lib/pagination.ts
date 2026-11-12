/**
 * Standard offset pagination metadata for v1 API responses.
 *
 * The trades endpoint (and any other list endpoint that wants the same
 * contract) returns a `pagination` object under `metadata` shaped like:
 *
 * ```json
 * {
 *   "total": 123,
 *   "page": 2,
 *   "limit": 50,
 *   "totalPages": 3,
 *   "hasPreviousPage": true,
 *   "hasNextPage": true,
 *   "links": {
 *     "first": "https://host/api/v1/markets/BTC%2FUSDT/trades?page=1&limit=50",
 *     "prev":  "https://host/api/v1/markets/BTC%2FUSDT/trades?page=1&limit=50",
 *     "next":  "https://host/api/v1/markets/BTC%2FUSDT/trades?page=3&limit=50",
 *     "last":  "https://host/api/v1/markets/BTC%2FUSDT/trades?page=3&limit=50"
 *   }
 * }
 * ```
 *
 * `links` mirror the RFC 8288 Link relation names and are `null` at the
 * boundaries — a client can always render first/prev/next/last controls
 * without knowing the page math. All other query parameters present on
 * the request URL are preserved; `page` and `limit` are overwritten.
 */

export interface OffsetPaginationLinkSet {
  /** Absolute URL for the first page. */
  first: string | null;
  /** Absolute URL for the previous page, or null on the first page. */
  prev: string | null;
  /** Absolute URL for the next page, or null on the last page. */
  next: string | null;
  /** Absolute URL for the last page (null when there are no results). */
  last: string | null;
}

export interface OffsetPaginationMetadata {
  /** Total number of items across all pages. */
  total: number;
  /** 1-indexed current page. */
  page: number;
  /** Items per page. */
  limit: number;
  /** Number of pages needed to cover `total` (0 when total is 0). */
  totalPages: number;
  /** True when `page > 1`. */
  hasPreviousPage: boolean;
  /** True when `page < totalPages`. */
  hasNextPage: boolean;
  /** RFC 8288-style navigation links; nulls at the boundaries. */
  links: OffsetPaginationLinkSet;
}

export interface BuildOffsetPaginationOptions {
  /** Total items across all pages. */
  total: number;
  /** 1-indexed page number (clamped to >= 1). */
  page: number;
  /** Items per page (clamped to >= 1). */
  limit: number;
  /**
   * Absolute request URL used to mint the navigation links. The current
   * query parameters are preserved; `page` and `limit` are overwritten.
   * When omitted, links are relative to `/`.
   */
  baseUrl?: string;
}

function buildPageUrl(base: URL, page: number, limit: number): string {
  const url = new URL(base.toString());
  url.searchParams.set('page', String(page));
  url.searchParams.set('limit', String(limit));
  return url.toString();
}

/**
 * Builds the standard offset-pagination metadata object.
 *
 * Deterministic and pure apart from URL copying; identical inputs yield
 * identical output.
 */
export function buildOffsetPagination(
  options: BuildOffsetPaginationOptions,
): OffsetPaginationMetadata {
  const total = Number.isFinite(options.total) && options.total > 0
    ? Math.floor(options.total)
    : 0;
  const page = Number.isFinite(options.page) && options.page >= 1
    ? Math.floor(options.page)
    : 1;
  const limit = Number.isFinite(options.limit) && options.limit >= 1
    ? Math.floor(options.limit)
    : 1;

  const totalPages = Math.ceil(total / limit);
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;

  const base = options.baseUrl ? new URL(options.baseUrl) : new URL('/', 'http://localhost');
  const link = (target: number): string => buildPageUrl(base, target, limit);

  return {
    total,
    page,
    limit,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    links: {
      first: link(1),
      prev: hasPreviousPage ? link(page - 1) : null,
      next: hasNextPage ? link(page + 1) : null,
      last: totalPages > 0 ? link(totalPages) : null,
    },
  };
}
