/**
 * @jest-environment node
 */
import { AdminStore } from '@/lib/admin-store';

describe('AdminStore', () => {
  let store: AdminStore;

  beforeEach(() => {
    store = new AdminStore();
  });

  describe('ban / unban', () => {
    it('bans a user and writes an audit entry', () => {
      const address = 'GTRADER22222222222222222222222222222222222222222222222222222222';
      const updated = store.setUserBanned(address, true, 'key_admin', 'Fraud');

      expect(updated?.banned).toBe(true);
      expect(updated?.banReason).toBe('Fraud');

      const log = store.getActivityFeed();
      expect(log).toHaveLength(1);
      expect(log[0]).toMatchObject({
        actor: 'key_admin',
        action: 'user_banned',
        targetType: 'user',
        targetId: address,
        details: 'Banned: Fraud',
      });
    });

    it('unbans a user and audits the lift', () => {
      const address = 'GSPAMMER33333333333333333333333333333333333333333333333333333333';
      const updated = store.setUserBanned(address, false, 'key_admin');

      expect(updated?.banned).toBe(false);
      expect(store.getActivityFeed()[0].action).toBe('user_unbanned');
    });

    it('returns null for unknown users without auditing', () => {
      const result = store.setUserBanned('GUNKNOWN00000000000000000000000000000000000000000000000000000', true, 'key_admin');
      expect(result).toBeNull();
      expect(store.getActivityFeed()).toHaveLength(0);
    });
  });

  describe('moderation queue', () => {
    it('starts with pending listings only', () => {
      const queue = store.listModerationQueue();
      expect(queue.map((l) => l.id)).toEqual(['lst_001', 'lst_002']);
    });

    it('removing a listing takes it out of the queue and audits the action', () => {
      const updated = store.setListingStatus('lst_002', 'removed', 'key_admin');

      expect(updated?.status).toBe('removed');
      expect(store.listModerationQueue().map((l) => l.id)).toEqual(['lst_001']);

      const [entry] = store.getActivityFeed();
      expect(entry).toMatchObject({
        actor: 'key_admin',
        action: 'listing_removed',
        targetType: 'listing',
        targetId: 'lst_002',
      });
    });

    it('approving a listing removes it from the queue too', () => {
      store.setListingStatus('lst_001', 'approved', 'key_admin');
      expect(store.listModerationQueue()).toHaveLength(1);
      expect(store.getActivityFeed()[0].action).toBe('listing_approved');
    });
  });

  describe('disputes', () => {
    it('resolves an open dispute, records resolution text and audits it', () => {
      const resolved = store.resolveDispute('dsp_001', 'Refund issued to buyer', 'key_admin');

      expect(resolved).toMatchObject({
        status: 'resolved',
        resolution: 'Refund issued to buyer',
      });
      expect(store.listDisputes('open')).toHaveLength(0);

      const [entry] = store.getActivityFeed();
      expect(entry.action).toBe('dispute_resolved');
      expect(entry.targetId).toBe('dsp_001');
    });

    it('refuses to resolve twice', () => {
      store.resolveDispute('dsp_001', 'first', 'key_admin');
      expect(store.resolveDispute('dsp_001', 'second', 'key_admin')).toBeNull();
      expect(store.getActivityFeed()).toHaveLength(1);
    });
  });
});
