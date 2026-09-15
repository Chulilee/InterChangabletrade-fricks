"use client";

import { useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationList } from "@/components/NotificationList";
import type { NotificationCategory } from "@/types/notification";

const FILTERS: Array<{ label: string; value: NotificationCategory | "all" }> = [
  { label: "All", value: "all" },
  { label: "Trade", value: "trade" },
  { label: "Order", value: "order" },
  { label: "Message", value: "message" },
  { label: "System", value: "system" },
  { label: "Wallet", value: "wallet" },
];

export function NotificationsClient() {
  const {
    notifications,
    unreadCount,
    markRead,
    markUnread,
    remove,
    markAllRead,
    clearAll,
  } = useNotifications();

  const [filter, setFilter] = useState<NotificationCategory | "all">("all");

  const filtered =
    filter === "all"
      ? notifications
      : notifications.filter((n) => n.category === filter);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="mt-0.5 text-sm text-brand-muted">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
              : "All caught up"}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="rounded-lg border border-brand-muted/30 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition ${
              filter === f.value
                ? "bg-white text-slate-900 shadow-sm"
                : "text-brand-muted hover:text-slate-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <NotificationList
        notifications={filtered}
        onMarkRead={markRead}
        onMarkUnread={markUnread}
        onDelete={remove}
      />
    </div>
  );
}
