import { render, screen, fireEvent } from "@testing-library/react";
import { ProfileEdit } from "../ProfileEdit";
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

describe("ProfileEdit", () => {
  const onSave = jest.fn();
  const onUploadAvatar = jest.fn();
  const onRemoveAvatar = jest.fn();
  const onCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    onSave.mockResolvedValue(true);
    onUploadAvatar.mockResolvedValue(true);
  });

  it("renders the form with pre-filled display name", () => {
    render(
      <ProfileEdit
        user={makeUser()}
        onSave={onSave}
        onUploadAvatar={onUploadAvatar}
        onRemoveAvatar={onRemoveAvatar}
        onCancel={onCancel}
      />,
    );

    const input = screen.getByLabelText("Display name") as HTMLInputElement;
    expect(input.value).toBe("Alice");
  });

  it("shows validation error for empty display name", async () => {
    render(
      <ProfileEdit
        user={makeUser()}
        onSave={onSave}
        onUploadAvatar={onUploadAvatar}
        onRemoveAvatar={onRemoveAvatar}
        onCancel={onCancel}
      />,
    );

    const input = screen.getByLabelText("Display name");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.click(screen.getByText("Save changes"));

    expect(await screen.findByText("Display name is required.")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("shows validation error for display name exceeding 50 characters", async () => {
    render(
      <ProfileEdit
        user={makeUser()}
        onSave={onSave}
        onUploadAvatar={onUploadAvatar}
        onRemoveAvatar={onRemoveAvatar}
        onCancel={onCancel}
      />,
    );

    const input = screen.getByLabelText("Display name");
    fireEvent.change(input, { target: { value: "A".repeat(51) } });
    fireEvent.click(screen.getByText("Save changes"));

    expect(
      await screen.findByText("Display name must be 50 characters or fewer."),
    ).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("calls onSave with correct data on valid submission", async () => {
    render(
      <ProfileEdit
        user={makeUser()}
        onSave={onSave}
        onUploadAvatar={onUploadAvatar}
        onRemoveAvatar={onRemoveAvatar}
        onCancel={onCancel}
      />,
    );

    const input = screen.getByLabelText("Display name");
    fireEvent.change(input, { target: { value: "Alice W." } });
    fireEvent.click(screen.getByText("Save changes"));

    expect(await screen.findByText("✓ Saved")).toBeInTheDocument();
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        displayName: "Alice W.",
      }),
    );
  });

  it("calls onCancel when cancel button is clicked", () => {
    render(
      <ProfileEdit
        user={makeUser()}
        onSave={onSave}
        onUploadAvatar={onUploadAvatar}
        onRemoveAvatar={onRemoveAvatar}
        onCancel={onCancel}
      />,
    );

    // There are two Cancel buttons (header + footer); click the first one
    const cancelButtons = screen.getAllByText("Cancel");
    fireEvent.click(cancelButtons[0]);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("renders notification toggle buttons", () => {
    render(
      <ProfileEdit
        user={makeUser()}
        onSave={onSave}
        onUploadAvatar={onUploadAvatar}
        onRemoveAvatar={onRemoveAvatar}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText("In-app notifications")).toBeInTheDocument();
    expect(screen.getByText("Email notifications")).toBeInTheDocument();
  });

  it("renders language and theme selectors", () => {
    render(
      <ProfileEdit
        user={makeUser()}
        onSave={onSave}
        onUploadAvatar={onUploadAvatar}
        onRemoveAvatar={onRemoveAvatar}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByLabelText("Language")).toBeInTheDocument();
    expect(screen.getByLabelText("Theme")).toBeInTheDocument();
  });
});
