import type { ModerationListing } from '@/types/admin';
import clsx from 'clsx';

/**
 * Presentational moderation queue table. Kept free of hooks and data fetching
 * so it can be unit-tested in isolation.
 */

const STATUS_STYLES: Record<ModerationListing['status'], string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  removed: 'bg-red-100 text-red-800',
};

export function ModerationQueueTable({
  listings,
  onRemove,
  onApprove,
}: {
  listings: ModerationListing[];
  onRemove: (listing: ModerationListing) => void;
  onApprove?: (listing: ModerationListing) => void;
}) {
  if (listings.length === 0) {
    return (
      <p className="rounded-xl border border-brand-muted/20 p-5 text-sm text-brand-muted">
        The moderation queue is empty. All listings have been reviewed.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-brand-muted/20">
      <table className="w-full text-left text-sm">
        <thead className="bg-brand-muted/10 text-xs uppercase tracking-wide text-brand-muted">
          <tr>
            <th className="px-4 py-3">Listing</th>
            <th className="px-4 py-3">Seller</th>
            <th className="px-4 py-3">Reports</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {listings.map((listing) => (
            <tr key={listing.id} className="border-t border-brand-muted/20">
              <td className="px-4 py-3">
                <span className="font-medium">{listing.title}</span>
                <span className="ml-2 text-xs text-brand-muted">{listing.id}</span>
              </td>
              <td className="max-w-[16rem] truncate px-4 py-3 font-mono text-xs">
                {listing.sellerAddress}
              </td>
              <td className="px-4 py-3">{listing.reportCount}</td>
              <td className="px-4 py-3">
                <span
                  className={clsx(
                    'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                    STATUS_STYLES[listing.status],
                  )}
                >
                  {listing.status}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                {onApprove && (
                  <button
                    type="button"
                    onClick={() => onApprove(listing)}
                    className="mr-2 rounded-lg border border-brand-muted/30 px-2.5 py-1 text-xs hover:border-brand-accent/50"
                  >
                    Approve
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(listing)}
                  className="rounded-lg border border-red-300 px-2.5 py-1 text-xs text-red-700 hover:bg-red-50"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
