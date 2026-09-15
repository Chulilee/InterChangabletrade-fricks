'use client';

import { useCallback, useEffect, useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import type {
  AdminUser,
  AuditLogEntry,
  Dispute,
  ModerationListing,
} from '@/types/admin';
import { ModerationQueueTable } from '@/components/ModerationQueueTable';

/**
 * Admin dashboard client. Access is gated twice:
 *
 * 1. Client-side: the connected wallet must appear in the admin wallet
 *    allow-list below. This list is a stop-gap until the platform has real
 *    identity management; extend it (or replace with an API-driven role
 *    lookup) when wallet-to-role linkage lands.
 * 2. Server-side: every /api/v1/admin/* route enforces the `admin` role via
 *    `requireAdmin()` in @/lib/api-middleware, so bypassing this UI gate
 *    gains nothing.
 */

const ADMIN_WALLETS: string[] = [
  'GADMIN1111111111111111111111111111111111111111111111111111111',
];

type Tab = 'users' | 'moderation' | 'disputes' | 'activity';

const TABS: { id: Tab; label: string }[] = [
  { id: 'users', label: 'Users' },
  { id: 'moderation', label: 'Moderation queue' },
  { id: 'disputes', label: 'Disputes' },
  { id: 'activity', label: 'Activity feed' },
];

export function AdminDashboardClient() {
  const { address } = useWallet();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [queue, setQueue] = useState<ModerationListing[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [activity, setActivity] = useState<AuditLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsAuthorized(address !== null && ADMIN_WALLETS.includes(address));
  }, [address]);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [u, q, d, a] = await Promise.all([
        fetch('/api/v1/admin/users').then((r) => r.json()),
        fetch('/api/v1/admin/listings').then((r) => r.json()),
        fetch('/api/v1/admin/disputes').then((r) => r.json()),
        fetch('/api/v1/admin/audit-log').then((r) => r.json()),
      ]);
      setUsers(u.data ?? []);
      setQueue(q.data ?? []);
      setDisputes(d.data ?? []);
      setActivity(a.data ?? []);
    } catch {
      setError('Failed to load admin data.');
    }
  }, []);

  useEffect(() => {
    if (isAuthorized) {
      void refresh();
    }
  }, [isAuthorized, refresh]);

  if (isAuthorized === null || !address) {
    return <p className="text-sm text-brand-muted">Checking access…</p>;
  }

  if (!isAuthorized) {
    return (
      <div className="rounded-xl border border-red-300 bg-red-50 p-6">
        <h2 className="text-lg font-semibold text-red-800">Access denied</h2>
        <p className="mt-1 text-sm text-red-700">
          The connected wallet is not authorized to view the admin dashboard.
        </p>
      </div>
    );
  }

  async function mutate(path: string, method: string, body: unknown) {
    setError(null);
    try {
      const res = await fetch(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(`Request failed with ${res.status}`);
      }
      await refresh();
    } catch {
      setError('Action failed. Please try again.');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex gap-2 border-b border-brand-muted/20 pb-2">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={
              tab === id
                ? 'rounded-lg bg-brand-muted/10 px-3 py-1.5 text-sm font-medium'
                : 'rounded-lg px-3 py-1.5 text-sm text-brand-muted hover:bg-brand-muted/10'
            }
          >
            {label}
          </button>
        ))}
      </nav>

      {error && (
        <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {tab === 'users' && (
        <div className="overflow-hidden rounded-xl border border-brand-muted/20">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-muted/10 text-xs uppercase tracking-wide text-brand-muted">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Wallet</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.address} className="border-t border-brand-muted/20">
                  <td className="px-4 py-3 font-medium">{user.displayName}</td>
                  <td className="max-w-[16rem] truncate px-4 py-3 font-mono text-xs">
                    {user.address}
                  </td>
                  <td className="px-4 py-3">
                    {user.banned ? (
                      <span title={user.banReason}>Banned</span>
                    ) : (
                      <span>Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        void mutate('/api/v1/admin/users', 'PATCH', {
                          address: user.address,
                          banned: !user.banned,
                        })
                      }
                      className="rounded-lg border border-brand-muted/30 px-2.5 py-1 text-xs hover:border-brand-accent/50"
                    >
                      {user.banned ? 'Unban' : 'Ban'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'moderation' && (
        <ModerationQueueTable
          listings={queue}
          onRemove={(listing) =>
            void mutate('/api/v1/admin/listings', 'DELETE', {
              listingId: listing.id,
              status: 'removed',
            })
          }
        />
      )}

      {tab === 'disputes' && (
        <div className="flex flex-col gap-3">
          {disputes.map((dispute) => (
            <div
              key={dispute.id}
              className="rounded-xl border border-brand-muted/20 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{dispute.id}</span>
                <span className="text-xs capitalize text-brand-muted">
                  {dispute.status}
                </span>
              </div>
              <p className="mt-1 text-sm">{dispute.reason}</p>
              {dispute.status === 'open' && (
                <ResolveForm onSubmit={(resolution) => void mutate('/api/v1/admin/disputes', 'POST', { disputeId: dispute.id, resolution })} />
              )}
            </div>
          ))}
          {disputes.length === 0 && (
            <p className="rounded-xl border border-brand-muted/20 p-5 text-sm text-brand-muted">
              No disputes filed.
            </p>
          )}
        </div>
      )}

      {tab === 'activity' && (
        <ul className="flex flex-col gap-2">
          {activity.map((entry) => (
            <li
              key={entry.id}
              className="rounded-xl border border-brand-muted/20 px-4 py-3 text-sm"
            >
              <span className="font-medium">{entry.action}</span>{' '}
              <span className="text-brand-muted">
                on {entry.targetType} {entry.targetId} — {entry.details}
              </span>
              <span className="ml-2 text-xs text-brand-muted">
                {new Date(entry.timestamp).toISOString()}
              </span>
            </li>
          ))}
          {activity.length === 0 && (
            <li className="rounded-xl border border-brand-muted/20 p-5 text-sm text-brand-muted">
              No moderation activity recorded yet.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function ResolveForm({ onSubmit }: { onSubmit: (resolution: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <form
      className="mt-3 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) {
          onSubmit(value.trim());
        }
      }}
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Resolution notes…"
        className="flex-1 rounded-lg border border-brand-muted/30 px-3 py-1.5 text-sm"
      />
      <button
        type="submit"
        className="rounded-lg border border-brand-muted/30 px-3 py-1.5 text-sm hover:border-brand-accent/50"
      >
        Resolve
      </button>
    </form>
  );
}
