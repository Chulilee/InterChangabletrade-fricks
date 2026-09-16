import type {
  AdminUser,
  AuditAction,
  AuditLogEntry,
  ModerationListing,
  Dispute,
  ListingModerationStatus,
} from '@/types/admin';

/**
 * In-memory admin data store. Mirrors the singleton pattern used by the
 * trading engine (`@/lib/trading-instance`) so swapping in a real database
 * later only requires changing this module.
 *
 * Every mutating action appends an immutable audit log entry, which is the
 * backbone of the moderation trail required for compliance review.
 */

const SEED_USERS: AdminUser[] = [
  {
    address: 'GADMIN1111111111111111111111111111111111111111111111111111111',
    displayName: 'platform-admin',
    banned: false,
    joinedAt: Date.parse('2025-01-10T09:00:00Z'),
  },
  {
    address: 'GTRADER22222222222222222222222222222222222222222222222222222222',
    displayName: 'art-dealer-7',
    banned: false,
    joinedAt: Date.parse('2025-02-14T12:30:00Z'),
  },
  {
    address: 'GSPAMMER33333333333333333333333333333333333333333333333333333333',
    displayName: 'bulk-minter',
    banned: true,
    banReason: 'Spam minting and wash trading',
    joinedAt: Date.parse('2025-03-01T08:15:00Z'),
  },
];

const SEED_LISTINGS: ModerationListing[] = [
  {
    id: 'lst_001',
    title: 'Fractional Warehouse Unit A-12',
    sellerAddress: 'GTRADER22222222222222222222222222222222222222222222222222222222',
    status: 'pending',
    reportCount: 0,
    createdAt: Date.parse('2025-06-20T10:00:00Z'),
  },
  {
    id: 'lst_002',
    title: "Guaranteed 40% weekly returns!!!",
    sellerAddress: 'GSPAMMER33333333333333333333333333333333333333333333333333333333',
    status: 'pending',
    reportCount: 11,
    createdAt: Date.parse('2025-07-01T16:45:00Z'),
  },
];

const SEED_DISPUTES: Dispute[] = [
  {
    id: 'dsp_001',
    listingId: 'lst_002',
    openedBy: 'GBUYER4444444444444444444444444444444444444444444444444444444444444',
    reason: 'Listing description does not match the delivered asset documents',
    status: 'open',
    createdAt: Date.parse('2025-07-05T11:20:00Z'),
  },
];

let nextAuditId = 1;

export class AdminStore {
  private users: AdminUser[] = SEED_USERS.map((u) => ({ ...u }));
  private listings: ModerationListing[] = SEED_LISTINGS.map((l) => ({ ...l }));
  private disputes: Dispute[] = SEED_DISPUTES.map((d) => ({ ...d }));
  private auditLog: AuditLogEntry[] = [];

  listUsers(): AdminUser[] {
    return this.users.map((u) => ({ ...u }));
  }

  listModerationQueue(): ModerationListing[] {
    return this.listings
      .filter((l) => l.status === 'pending')
      .map((l) => ({ ...l }));
  }

  listDisputes(status?: Dispute['status']): Dispute[] {
    return this.disputes
      .filter((d) => !status || d.status === status)
      .map((d) => ({ ...d }));
  }

  getActivityFeed(limit = 50): AuditLogEntry[] {
    return this.auditLog.slice(-limit).reverse().map((e) => ({ ...e }));
  }

  setUserBanned(address: string, banned: boolean, actor: string, reason?: string): AdminUser | null {
    const user = this.users.find((u) => u.address === address);
    if (!user || user.banned === banned) {
      return null;
    }
    user.banned = banned;
    user.banReason = banned ? (reason ?? 'No reason provided') : undefined;
    this.appendAudit(
      actor,
      banned ? 'user_banned' : 'user_unbanned',
      'user',
      address,
      banned ? `Banned: ${user.banReason}` : 'Ban lifted',
    );
    return { ...user };
  }

  setListingStatus(
    listingId: string,
    status: Extract<ListingModerationStatus, 'approved' | 'removed'>,
    actor: string,
  ): ModerationListing | null {
    const listing = this.listings.find((l) => l.id === listingId);
    if (!listing || listing.status === status) {
      return null;
    }
    listing.status = status;
    this.appendAudit(
      actor,
      status === 'removed' ? 'listing_removed' : 'listing_approved',
      'listing',
      listingId,
      status === 'removed'
        ? `Removed listing "${listing.title}" after ${listing.reportCount} reports`
        : `Approved listing "${listing.title}"`,
    );
    return { ...listing };
  }

  resolveDispute(disputeId: string, resolution: string, actor: string): Dispute | null {
    const dispute = this.disputes.find((d) => d.id === disputeId);
    if (!dispute || dispute.status === 'resolved') {
      return null;
    }
    dispute.status = 'resolved';
    dispute.resolution = resolution;
    this.appendAudit(actor, 'dispute_resolved', 'dispute', disputeId, resolution);
    return { ...dispute };
  }

  private appendAudit(
    actor: string,
    action: AuditAction,
    targetType: AuditLogEntry['targetType'],
    targetId: string,
    details: string,
  ): void {
    this.auditLog.push({
      id: `aud_${String(nextAuditId++).padStart(6, '0')}`,
      timestamp: Date.now(),
      actor,
      action,
      targetType,
      targetId,
      details,
    });
  }
}
