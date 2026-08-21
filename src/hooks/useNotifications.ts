"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addNotification,
  clearAllNotifications,
  deleteNotification,
  getNotifications,
  getPreferences,
  markAllAsRead,
  markAsRead,
  markAsUnread,
  savePreferences,
  startPolling,
  stopPolling,
  subscribe,
} from "@/services/notificationService";
import type {
  Notification,
  NotificationPreferences,
} from "@/types/notification";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseNotificationsReturn {
  /** All notifications, most-recent first. */
  notifications: Notification[];
  /** Number of unread notifications. */
  unreadCount: number;
  /** Mark a single notification as read. */
  markRead: (id: string) => void;
  /** Mark a single notification as unread. */
  markUnread: (id: string) => void;
  /** Mark every notification as read. */
  markAllRead: () => void;
  /** Delete a single notification. */
  remove: (id: string) => void;
  /** Remove all notifications. */
  clearAll: () => void;
  /** Push a notification into the store programmatically. */
  push: (partial: Omit<Notification, "id" | "timestamp" | "read">) => Notification;
  /** Email notification preferences. */
  preferences: NotificationPreferences;
  /** Update email notification preferences. */
  updatePreferences: (prefs: NotificationPreferences) => void;
  /** Whether a WebSocket connection is active. */
  wsConnected: boolean;
  /** Reload from localStorage. */
  refresh: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    getPreferences,
  );
  const [wsConnected, setWsConnected] = useState(false);
  // Sync on mount and whenever the service store changes
  const refresh = useCallback(() => {
    const all = getNotifications();
    setNotifications(all);
    setUnreadCount(all.filter((n) => !n.read).length);
  }, []);

  useEffect(() => {
    refresh();
    const unsub = subscribe(refresh);
    return unsub;
  }, [refresh]);

  // --- WebSocket with polling fallback ---
  useEffect(() => {
    let ws: WebSocket | null = null;
    let fallbackStarted = false;

    function tryConnect() {
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        ws = new WebSocket(`${protocol}//${window.location.host}/ws/notifications`);

        ws.onopen = () => {
          setWsConnected(true);
          // If WS succeeds, stop any polling fallback
          if (fallbackStarted) {
            stopPolling();
            fallbackStarted = false;
          }
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "notification" && msg.payload) {
              addNotification(msg.payload);
            }
          } catch {
            // ignore malformed messages
          }
        };

        ws.onerror = () => {
          // Graceful fallback: start polling
          ws?.close();
          setWsConnected(false);
          if (!fallbackStarted) {
            fallbackStarted = true;
            startPolling(async () => getNotifications());
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
          // Attempt reconnect after delay
          setTimeout(tryConnect, 10_000);
        };
      } catch {
        // WebSocket unavailable — fall back to polling
        setWsConnected(false);
        if (!fallbackStarted) {
          fallbackStarted = true;
          startPolling(async () => getNotifications());
        }
      }
    }

    tryConnect();

    return () => {
      ws?.close();
      stopPolling();
    };
  }, []);

  // --- Actions ---

  const markRead = useCallback((id: string) => {
    markAsRead(id);
  }, []);

  const markUnread = useCallback((id: string) => {
    markAsUnread(id);
  }, []);

  const markAllRead = useCallback(() => {
    markAllAsRead();
  }, []);

  const remove = useCallback((id: string) => {
    deleteNotification(id);
  }, []);

  const clearAll = useCallback(() => {
    clearAllNotifications();
  }, []);

  const push = useCallback(
    (partial: Omit<Notification, "id" | "timestamp" | "read">) => {
      return addNotification(partial);
    },
    [],
  );

  const updatePreferences = useCallback((prefs: NotificationPreferences) => {
    savePreferences(prefs);
    setPreferences(prefs);
  }, []);

  return {
    notifications,
    unreadCount,
    markRead,
    markUnread,
    markAllRead,
    remove,
    clearAll,
    push,
    preferences,
    updatePreferences,
    wsConnected,
    refresh,
  };
}
