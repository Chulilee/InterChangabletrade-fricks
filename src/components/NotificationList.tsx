"use client";

import { Bell } from "lucide-react";
import type { Notification } from "@/types/notification";
import { NotificationItem } from "@/components/NotificationItem";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface NotificationListProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkUnread: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NotificationList({
  notifications,
  onMarkRead,
  onMarkUnread,
  onDelete,
}: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Bell className="mb-3 h-10 w-10 text-brand-muted/40" />
        <p className="text-sm font-medium text-slate-600">No notifications yet</p>
        <p className="mt-1 text-xs text-brand-muted">
          Trade events, messages, and alerts will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2" role="list" aria-label="Notifications">
      {notifications.map((n) => (
        <NotificationItem
          key={n.id}
          notification={n}
          onMarkRead={onMarkRead}
          onMarkUnread={onMarkUnread}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
