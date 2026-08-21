/** Notification types for the InterChangableTrade platform. */

export type NotificationCategory =
  | "trade"
  | "message"
  | "system"
  | "order"
  | "wallet";

export type NotificationPriority = "low" | "medium" | "high";

export interface Notification {
  /** Unique notification identifier. */
  id: string;
  /** Category of the notification. */
  category: NotificationCategory;
  /** Short headline. */
  title: string;
  /** Longer body text. */
  body: string;
  /** ISO 8601 timestamp. */
  timestamp: string;
  /** Whether the notification has been read. */
  read: boolean;
  /** Priority level. */
  priority: NotificationPriority;
  /** Optional link to navigate to when clicked (e.g. "/portfolio", "/marketplace"). */
  href?: string;
  /** Optional key-value metadata (asset id, order id, etc.). */
  metadata?: Record<string, string | number | boolean>;
}

export interface NotificationPreferences {
  /** Whether to receive email notifications. */
  emailEnabled: boolean;
  /** Email address for notifications. */
  email: string;
  /** Per-category email opt-in. */
  emailCategories: NotificationCategory[];
}
