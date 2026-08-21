import { render, screen } from "@testing-library/react";
import { NotificationList } from "../NotificationList";
import type { Notification } from "@/types/notification";

function makeNotif(overrides: Partial<Notification> = {}): Notification {
  return {
    id: `n-${Math.random()}`,
    category: "trade",
    title: "Test notification",
    body: "Test body",
    timestamp: new Date().toISOString(),
    read: false,
    priority: "medium",
    ...overrides,
  };
}

describe("NotificationList", () => {
  const onMarkRead = jest.fn();
  const onMarkUnread = jest.fn();
  const onDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the empty state when no notifications", () => {
    render(
      <NotificationList
        notifications={[]}
        onMarkRead={onMarkRead}
        onMarkUnread={onMarkUnread}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByText("No notifications yet")).toBeInTheDocument();
    expect(
      screen.getByText("Trade events, messages, and alerts will appear here."),
    ).toBeInTheDocument();
  });

  it("renders a list of notifications", () => {
    const notifications = [
      makeNotif({ id: "n1", title: "First notification" }),
      makeNotif({ id: "n2", title: "Second notification" }),
    ];

    render(
      <NotificationList
        notifications={notifications}
        onMarkRead={onMarkRead}
        onMarkUnread={onMarkUnread}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByText("First notification")).toBeInTheDocument();
    expect(screen.getByText("Second notification")).toBeInTheDocument();
    expect(screen.getByTestId("notification-n1")).toBeInTheDocument();
    expect(screen.getByTestId("notification-n2")).toBeInTheDocument();
  });

  it("renders with the correct list label", () => {
    render(
      <NotificationList
        notifications={[makeNotif()]}
        onMarkRead={onMarkRead}
        onMarkUnread={onMarkUnread}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByLabelText("Notifications")).toBeInTheDocument();
  });
});
