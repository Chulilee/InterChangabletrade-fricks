import { render, screen } from "@testing-library/react";
import { ProfileView } from "../ProfileView";
import type { User } from "@/types/auth";
import type { UserPreferences } from "@/types/profile";

function makeUser(overrides: Partial<User> = {}): User & { preferences: UserPreferences } {
  return {
    id: "user_test",
    email: "alice@example.com",
    name: "Alice",
    createdAt: 1700000000000,
    ...overrides,
    preferences: {
      displayName: "Alice",
      notificationsEnabled: true,
      emailNotificationsEnabled: false,
      language: "en",
      theme: "system",
    },
  };
}

describe("ProfileView", () => {
  it("renders user name and email", () => {
    render(<ProfileView user={makeUser()} onEdit={jest.fn()} />);
    // "Alice" appears in both the name heading and the display name row
    expect(screen.getAllByText("Alice").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
  });

  it("displays the first letter of name when no avatar is set", () => {
    const { container } = render(
      <ProfileView user={makeUser()} onEdit={jest.fn()} />,
    );
    const initial = container.querySelector(".text-2xl");
    expect(initial).toBeInTheDocument();
    expect(initial?.textContent).toBe("A");
  });

  it("displays avatar image when avatar is set", () => {
    const user = makeUser({ avatar: "data:image/png;base64,abc" });
    render(<ProfileView user={user} onEdit={jest.fn()} />);
    const img = screen.getByAltText("Alice's avatar");
    expect(img).toHaveAttribute("src", "data:image/png;base64,abc");
  });

  it("shows display name from preferences", () => {
    const user = makeUser();
    user.preferences.displayName = "Alice W.";
    render(<ProfileView user={user} onEdit={jest.fn()} />);
    expect(screen.getByText("Alice W.")).toBeInTheDocument();
  });

  it("calls onEdit when Edit profile button is clicked", () => {
    const onEdit = jest.fn();
    render(<ProfileView user={makeUser()} onEdit={onEdit} />);
    screen.getByText("Edit profile").click();
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("shows notification status", () => {
    render(<ProfileView user={makeUser()} onEdit={jest.fn()} />);
    expect(screen.getByText("Enabled")).toBeInTheDocument();
    expect(screen.getByText("Disabled")).toBeInTheDocument();
  });

  it("displays member since date", () => {
    render(<ProfileView user={makeUser()} onEdit={jest.fn()} />);
    expect(screen.getByText("Member since")).toBeInTheDocument();
  });
});
