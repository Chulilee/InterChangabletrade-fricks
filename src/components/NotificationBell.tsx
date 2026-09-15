"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationItem } from "@/components/NotificationItem";

/**
 * Bell icon with unread-count badge and a dropdown panel showing the
 * five most-recent notifications inline.
 */
export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    markRead,
    markUnread,
    remove,
    markAllRead,
  } = useNotifications();

  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handle(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open]);

  const preview = notifications.slice(0, 5);

  const handleMarkRead = useCallback(
    (id: string) => {
      markRead(id);
    },
    [markRead],
  );

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-brand-muted transition hover:bg-slate-100 hover:text-slate-700"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-accent px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notification panel"
          className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-brand-muted/20 bg-white shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-brand-muted/10 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => { markAllRead(); }}
                className="text-xs font-medium text-brand-accent transition hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Items */}
          <div className="max-h-80 overflow-y-auto p-2">
            {preview.length === 0 ? (
              <p className="py-8 text-center text-xs text-brand-muted">
                No notifications
              </p>
            ) : (
              preview.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onMarkRead={handleMarkRead}
                  onMarkUnread={markUnread}
                  onDelete={remove}
                />
              ))
            )}
          </div>

          {/* Footer */}
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-brand-muted/10 bg-slate-50 py-2.5 text-center text-xs font-medium text-brand-accent transition hover:bg-slate-100"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
