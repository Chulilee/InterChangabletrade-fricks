"use client";

import type {
  Notification,
  NotificationCategory,
  NotificationPreferences,
} from "@/types/notification";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "ict.notifications";
const PREFS_KEY = "ict.notification.prefs";
const MAX_NOTIFICATIONS = 200;
const POLL_INTERVAL_MS = 15_000;

// ---------------------------------------------------------------------------
// In-memory store (shared across the app on the client)
// ---------------------------------------------------------------------------

let notifications: Notification[] = [];
let listeners: Array<() => void> = [];
let pollTimer: ReturnType<typeof setInterval> | null = null;

let eventCounter = 0;

function generateId(): string {
  return `notif_${Date.now()}_${(eventCounter++).toString(36)}`;
}

// ---------------------------------------------------------------------------
// Persistence helpers (localStorage)
// ---------------------------------------------------------------------------

function loadFromStorage(): Notification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Notification[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
}

// ---------------------------------------------------------------------------
// Listeners (for real-time re-render)
// ---------------------------------------------------------------------------

function emitChange(): void {
  for (const fn of listeners) fn();
}

export function subscribe(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((fn) => fn !== listener);
  };
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

/** Return all notifications (most recent first). */
export function getNotifications(): Notification[] {
  if (notifications.length === 0) {
    notifications = loadFromStorage();
  }
  return [...notifications];
}

/** Number of unread notifications. */
export function getUnreadCount(): number {
  return getNotifications().filter((n) => !n.read).length;
}

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

/** Mark a single notification as read. */
export function markAsRead(id: string): void {
  notifications = getNotifications().map((n) =>
    n.id === id ? { ...n, read: true } : n,
  );
  saveToStorage();
  emitChange();
}

/** Mark a single notification as unread. */
export function markAsUnread(id: string): void {
  notifications = getNotifications().map((n) =>
    n.id === id ? { ...n, read: false } : n,
  );
  saveToStorage();
  emitChange();
}

/** Mark all notifications as read. */
export function markAllAsRead(): void {
  notifications = getNotifications().map((n) => ({ ...n, read: true }));
  saveToStorage();
  emitChange();
}

/** Delete a single notification. */
export function deleteNotification(id: string): void {
  notifications = getNotifications().filter((n) => n.id !== id);
  saveToStorage();
  emitChange();
}

/** Add a notification to the store (e.g. from a WebSocket push). */
export function addNotification(
  partial: Omit<Notification, "id" | "timestamp" | "read">,
): Notification {
  const notif: Notification = {
    ...partial,
    id: generateId(),
    timestamp: new Date().toISOString(),
    read: false,
  };

  notifications = [notif, ...getNotifications()].slice(0, MAX_NOTIFICATIONS);
  saveToStorage();
  emitChange();
  return notif;
}

// ---------------------------------------------------------------------------
// Email preferences
// ---------------------------------------------------------------------------

const DEFAULT_PREFS: NotificationPreferences = {
  emailEnabled: false,
  email: "",
  emailCategories: ["trade", "order", "system"],
};

export function getPreferences(): NotificationPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    return raw
      ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<NotificationPreferences>) }
      : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePreferences(prefs: NotificationPreferences): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

// ---------------------------------------------------------------------------
// Simulated email send (staging only)
// ---------------------------------------------------------------------------

export async function simulateEmailSend(
  notification: Notification,
): Promise<boolean> {
  const prefs = getPreferences();
  if (!prefs.emailEnabled || !prefs.email) return false;
  if (!prefs.emailCategories.includes(notification.category)) return false;

  // Simulate network delay
  await new Promise((r) => setTimeout(r, 200));

  console.log(
    `[NotificationService] Simulated email sent to ${prefs.email} — "${notification.title}"`,
  );
  return true;
}

// ---------------------------------------------------------------------------
// Seed helpers (for development / tests)
// ---------------------------------------------------------------------------

export function seedNotifications(seed: Notification[]): void {
  notifications = [...seed];
  saveToStorage();
  emitChange();
}

export function clearAllNotifications(): void {
  notifications = [];
  saveToStorage();
  emitChange();
}

// ---------------------------------------------------------------------------
// Polling (graceful fallback for when WebSocket is unavailable)
// ---------------------------------------------------------------------------

/** Callback that fetches the latest notifications from a remote source. */
type PollFetcher = () => Promise<Notification[]>;

/** Start polling for new notifications. */
export function startPolling(fetcher: PollFetcher): void {
  stopPolling();
  pollTimer = setInterval(() => {
    void fetcher().then((incoming) => {
      if (incoming.length === 0) return;
      // Merge: keep existing, add new ones that aren't already present
      const existing = new Set(notifications.map((n) => n.id));
      const newOnes = incoming.filter((n) => !existing.has(n.id));
      if (newOnes.length > 0) {
        notifications = [...newOnes, ...notifications].slice(0, MAX_NOTIFICATIONS);
        saveToStorage();
        emitChange();
      }
    });
  }, POLL_INTERVAL_MS);
}

export function stopPolling(): void {
  if (pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}
