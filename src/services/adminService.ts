import type {
  AdminUser,
  AuditLogEntry,
  Dispute,
  ModerationListing,
} from '@/types/admin';
import { AdminStore } from '@/lib/admin-store';

/**
 * Admin dashboard & moderation service. Backed by the in-memory admin store
 * today; async signatures mirror the eventual REST client so callers do not
 * change when a real backend transport is wired in.
 */

const LATENCY_MS = 200;
let store: AdminStore | null = null;

function getStore(): AdminStore {
  if (!store) {
    store = new AdminStore();
  }
  return store;
}

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

export async function listUsers(): Promise<AdminUser[]> {
  return delay(getStore().listUsers());
}

export async function listModerationQueue(): Promise<ModerationListing[]> {
  return delay(getStore().listModerationQueue());
}

export async function listDisputes(): Promise<Dispute[]> {
  return delay(getStore().listDisputes());
}

export async function getActivityFeed(limit?: number): Promise<AuditLogEntry[]> {
  return delay(getStore().getActivityFeed(limit));
}
