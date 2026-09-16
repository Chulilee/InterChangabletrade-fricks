import { render, screen, fireEvent } from "@testing-library/react";
import { NotificationItem } from "../NotificationItem";
import type { Notification } from "@/types/notification";

function makeNotif(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "test-1",
    category: "trade",
    title: "Trade completed",
    body: "Your order was filled successfully.",
    timestamp: new Date().toISOString(),
    read: false,
    priority: "medium",
    ...overrides,
  };
}

describe("NotificationItem", () => {
  const onMarkRead = jest.fn();
  const onMarkUnread = jest.fn();
  const onDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the notification title and body", () => {
    render(
      <NotificationItem
        notification={makeNotif()}
        onMarkRead={onMarkRead}
        onMarkUnread={onMarkUnread}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByText("Trade completed")).toBeInTheDocument();
    expect(
      screen.getByText("Your order was filled successfully."),
    ).toBeInTheDocument();
  });

  it("shows unread dot for unread notifications", () => {
    const { container } = render(
      <NotificationItem
        notification={makeNotif({ read: false })}
        onMarkRead={onMarkRead}
        onMarkUnread={onMarkUnread}
        onDelete={onDelete}
      />,
    );

    // The unread dot is a span with bg-brand-accent
    const dot = container.querySelector(".bg-brand-accent");
    expect(dot).toBeInTheDocument();
  });

  it("calls onMarkRead when mark-as-read button is clicked", () => {
    render(
      <NotificationItem
        notification={makeNotif({ read: false })}
        onMarkRead={onMarkRead}
        onMarkUnread={onMarkUnread}
        onDelete={onDelete}
      />,
    );

    const markReadBtn = screen.getByTitle("Mark as read");
    fireEvent.click(markReadBtn);
    expect(onMarkRead).toHaveBeenCalledWith("test-1");
  });

  it("calls onMarkUnread when mark-as-unread button is clicked", () => {
    render(
      <NotificationItem
        notification={makeNotif({ read: true })}
        onMarkRead={onMarkRead}
        onMarkUnread={onMarkUnread}
        onDelete={onDelete}
      />,
    );

    const markUnreadBtn = screen.getByTitle("Mark as unread");
    fireEvent.click(markUnreadBtn);
    expect(onMarkUnread).toHaveBeenCalledWith("test-1");
  });

  it("calls onDelete when dismiss button is clicked", () => {
    render(
      <NotificationItem
        notification={makeNotif()}
        onMarkRead={onMarkRead}
        onMarkUnread={onMarkUnread}
        onDelete={onDelete}
      />,
    );

    const dismissBtn = screen.getByTitle("Dismiss");
    fireEvent.click(dismissBtn);
    expect(onDelete).toHaveBeenCalledWith("test-1");
  });

  it("renders as a link when href is provided", () => {
    render(
      <NotificationItem
        notification={makeNotif({ href: "/portfolio" })}
        onMarkRead={onMarkRead}
        onMarkUnread={onMarkUnread}
        onDelete={onDelete}
      />,
    );

    const link = screen.getByText("Trade completed").closest("a");
    expect(link).toHaveAttribute("href", "/portfolio");
  });

  it("displays category label", () => {
    render(
      <NotificationItem
        notification={makeNotif({ category: "system" })}
        onMarkRead={onMarkRead}
        onMarkUnread={onMarkUnread}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByText("system")).toBeInTheDocument();
  });
});
