/** @jest-environment jsdom */
import {
  addNotification,
  clearAllNotifications,
  deleteNotification,
  getNotifications,
  getPreferences,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
  markAsUnread,
  savePreferences,
  seedNotifications,
  simulateEmailSend,
} from "@/services/notificationService";
import type { Notification } from "@/types/notification";

function makeNotif(overrides: Partial<Notification> = {}): Notification {
  return {
    id: `test-${Date.now()}-${Math.random()}`,
    category: "trade",
    title: "Trade completed",
    body: "Your order was filled.",
    timestamp: new Date().toISOString(),
    read: false,
    priority: "medium",
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  clearAllNotifications();
});

describe("notificationService", () => {
  describe("addNotification", () => {
    it("adds a notification and returns it with id and timestamp", () => {
      const notif = addNotification({
        category: "trade",
        title: "Test",
        body: "Body",
        priority: "low",
      });

      expect(notif.id).toMatch(/^notif_/);
      expect(notif.read).toBe(false);
      expect(notif.title).toBe("Test");
    });

    it("persists to localStorage", () => {
      addNotification({
        category: "system",
        title: "Alert",
        body: "System alert",
        priority: "high",
      });

      const stored = JSON.parse(localStorage.getItem("ict.notifications") ?? "[]");
      expect(stored).toHaveLength(1);
      expect(stored[0].title).toBe("Alert");
    });
  });

  describe("getNotifications / getUnreadCount", () => {
    it("returns all notifications", () => {
      seedNotifications([makeNotif({ id: "a" }), makeNotif({ id: "b" })]);
      expect(getNotifications()).toHaveLength(2);
    });

    it("counts unread", () => {
      seedNotifications([
        makeNotif({ id: "a", read: false }),
        makeNotif({ id: "b", read: true }),
      ]);
      expect(getUnreadCount()).toBe(1);
    });
  });

  describe("markAsRead / markAsUnread", () => {
    it("marks a notification as read", () => {
      seedNotifications([makeNotif({ id: "n1", read: false })]);
      markAsRead("n1");
      expect(getNotifications()[0].read).toBe(true);
      expect(getUnreadCount()).toBe(0);
    });

    it("marks a notification as unread", () => {
      seedNotifications([makeNotif({ id: "n1", read: true })]);
      markAsUnread("n1");
      expect(getNotifications()[0].read).toBe(false);
      expect(getUnreadCount()).toBe(1);
    });
  });

  describe("markAllAsRead", () => {
    it("marks all as read", () => {
      seedNotifications([
        makeNotif({ id: "a", read: false }),
        makeNotif({ id: "b", read: false }),
      ]);
      markAllAsRead();
      expect(getUnreadCount()).toBe(0);
    });
  });

  describe("deleteNotification", () => {
    it("removes a notification", () => {
      seedNotifications([makeNotif({ id: "a" }), makeNotif({ id: "b" })]);
      deleteNotification("a");
      expect(getNotifications()).toHaveLength(1);
      expect(getNotifications()[0].id).toBe("b");
    });
  });

  describe("clearAllNotifications", () => {
    it("empties the store", () => {
      seedNotifications([makeNotif({ id: "a" })]);
      clearAllNotifications();
      expect(getNotifications()).toHaveLength(0);
      expect(getUnreadCount()).toBe(0);
    });
  });

  describe("NotificationPreferences", () => {
    it("returns default preferences when nothing is stored", () => {
      const prefs = getPreferences();
      expect(prefs.emailEnabled).toBe(false);
      expect(prefs.email).toBe("");
      expect(prefs.emailCategories).toContain("trade");
    });

    it("persists and loads preferences", () => {
      savePreferences({
        emailEnabled: true,
        email: "test@example.com",
        emailCategories: ["trade", "system"],
      });
      const prefs = getPreferences();
      expect(prefs.emailEnabled).toBe(true);
      expect(prefs.email).toBe("test@example.com");
      expect(prefs.emailCategories).toEqual(["trade", "system"]);
    });
  });

  describe("simulateEmailSend", () => {
    it("returns false when email is disabled", async () => {
      const notif = addNotification({
        category: "trade",
        title: "Test",
        body: "Body",
        priority: "low",
      });
      const result = await simulateEmailSend(notif);
      expect(result).toBe(false);
    });

    it("returns true when email is enabled and category matches", async () => {
      savePreferences({
        emailEnabled: true,
        email: "test@example.com",
        emailCategories: ["trade"],
      });
      const notif = addNotification({
        category: "trade",
        title: "Test",
        body: "Body",
        priority: "low",
      });
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      const result = await simulateEmailSend(notif);
      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("returns false when category is not opted in", async () => {
      savePreferences({
        emailEnabled: true,
        email: "test@example.com",
        emailCategories: ["trade"],
      });
      const notif = addNotification({
        category: "message",
        title: "Test",
        body: "Body",
        priority: "low",
      });
      const result = await simulateEmailSend(notif);
      expect(result).toBe(false);
    });
  });
});
