export interface AdminUser {
  address: string;
  displayName: string;
  banned: boolean;
  banReason?: string;
  joinedAt: number;
}

export type ListingModerationStatus = 'pending' | 'approved' | 'removed';

export interface ModerationListing {
  id: string;
  title: string;
  sellerAddress: string;
  status: ListingModerationStatus;
  reportCount: number;
  createdAt: number;
}

export type DisputeStatus = 'open' | 'resolved';

export interface Dispute {
  id: string;
  listingId: string;
  openedBy: string;
  reason: string;
  status: DisputeStatus;
  resolution?: string;
  createdAt: number;
}

export type AuditAction =
  | 'user_banned'
  | 'user_unbanned'
  | 'listing_removed'
  | 'listing_approved'
  | 'dispute_resolved';

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  actor: string;
  action: AuditAction;
  targetType: 'user' | 'listing' | 'dispute';
  targetId: string;
  details: string;
}

export interface ResolveDisputeRequest {
  disputeId: string;
  resolution: string;
}
