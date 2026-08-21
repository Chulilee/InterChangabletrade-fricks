"use client";

import Link from "next/link";
import {
  Bell,
  ArrowUpRight,
  CircleAlert,
  MessageSquare,
  Package,
  Wallet,
  Clock,
  Mail,
  MailOpen,
} from "lucide-react";
import type { Notification, NotificationCategory } from "@/types/notification";

// ---------------------------------------------------------------------------
// Category → icon / color mapping
// ---------------------------------------------------------------------------

const CATEGORY_META: Record<
  NotificationCategory,
  { icon: typeof Bell; color: string }
> = {
  trade: { icon: ArrowUpRight, color: "text-emerald-600" },
  message: { icon: MessageSquare, color: "text-blue-600" },
  system: { icon: CircleAlert, color: "text-amber-600" },
  order: { icon: Package, color: "text-violet-600" },
  wallet: { icon: Wallet, color: "text-sky-600" },
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onMarkUnread: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NotificationItem({
  notification,
  onMarkRead,
  onMarkUnread,
  onDelete,
}: NotificationItemProps) {
  const { id, title, body, timestamp, read, priority, href, category } =
    notification;
  const meta = CATEGORY_META[category] ?? CATEGORY_META.system;
  const Icon = meta.icon;

  const wrapperClasses = [
    "flex gap-3 rounded-xl border p-4 transition",
    read
      ? "border-transparent bg-white/50 opacity-70 hover:opacity-100"
      : "border-brand-accent/20 bg-white shadow-sm",
    priority === "high" && !read ? "ring-1 ring-amber-300/40" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <div className="flex gap-3">
      {/* Category icon */}
      <div
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 ${meta.color}`}
      >
        <Icon className="h-4 w-4" />
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-snug ${read ? "text-slate-600" : "font-semibold text-slate-900"}`}>
            {title}
          </p>
          {!read && (
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-accent" />
          )}
        </div>
        <p className="mt-0.5 text-xs text-brand-muted line-clamp-2">{body}</p>
        <div className="mt-1.5 flex items-center gap-3 text-xs text-brand-muted">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {relativeTime(timestamp)}
          </span>
          <span className="capitalize">{category}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className={wrapperClasses} data-testid={`notification-${id}`}>
      {href ? (
        <Link href={href} className="block flex-1" onClick={() => { if (!read) onMarkRead(id); }}>
          {content}
        </Link>
      ) : (
        <div className="flex-1">{content}</div>
      )}

      {/* Actions */}
      <div className="flex shrink-0 flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => (read ? onMarkUnread(id) : onMarkRead(id))}
          className="rounded-md p-1 text-brand-muted transition hover:bg-slate-100 hover:text-slate-700"
          title={read ? "Mark as unread" : "Mark as read"}
        >
          {read ? (
            <Mail className="h-4 w-4" />
          ) : (
            <MailOpen className="h-4 w-4" />
          )}
        </button>
        <button
          type="button"
          onClick={() => onDelete(id)}
          className="rounded-md p-1 text-brand-muted transition hover:bg-red-50 hover:text-red-500"
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
