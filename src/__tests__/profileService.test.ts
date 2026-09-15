/**
 * @jest-environment jsdom
 */
import {
  getProfile,
  getUserPreferences,
  getUserSettings,
  removeAvatar,
  updateProfile,
  uploadAvatar,
} from "@/services/profileService";

beforeEach(() => {
  localStorage.clear();
});

describe("profileService", () => {
  describe("getUserSettings", () => {
    it("returns default settings when nothing is stored", () => {
      const settings = getUserSettings();
      expect(settings.preferences.displayName).toBe("");
      expect(settings.preferences.notificationsEnabled).toBe(true);
      expect(settings.preferences.emailNotificationsEnabled).toBe(false);
      expect(settings.preferences.language).toBe("en");
      expect(settings.preferences.theme).toBe("system");
      expect(settings.updatedAt).toBeDefined();
    });

    it("returns stored settings after an update", () => {
      updateProfile({ displayName: "Alice" });
      const settings = getUserSettings();
      expect(settings.preferences.displayName).toBe("Alice");
    });
  });

  describe("getUserPreferences", () => {
    it("returns default preferences when nothing is stored", () => {
      const prefs = getUserPreferences();
      expect(prefs.notificationsEnabled).toBe(true);
      expect(prefs.language).toBe("en");
    });
  });

  describe("updateProfile", () => {
    it("updates display name", () => {
      const settings = updateProfile({ displayName: "Bob" });
      expect(settings.preferences.displayName).toBe("Bob");
    });

    it("updates notification preferences", () => {
      const settings = updateProfile({
        notificationsEnabled: false,
        emailNotificationsEnabled: true,
      });
      expect(settings.preferences.notificationsEnabled).toBe(false);
      expect(settings.preferences.emailNotificationsEnabled).toBe(true);
    });

    it("updates language and theme", () => {
      const settings = updateProfile({ language: "es", theme: "dark" });
      expect(settings.preferences.language).toBe("es");
      expect(settings.preferences.theme).toBe("dark");
    });

    it("updates the updatedAt timestamp", () => {
      const before = getUserSettings().updatedAt;
      // Small delay to ensure different timestamp
      updateProfile({ displayName: "Test" });
      const after = getUserSettings().updatedAt;
      expect(after >= before).toBe(true);
    });

    it("preserves other fields when updating a single field", () => {
      updateProfile({ displayName: "Original" });
      updateProfile({ theme: "dark" });
      const settings = getUserSettings();
      expect(settings.preferences.displayName).toBe("Original");
      expect(settings.preferences.theme).toBe("dark");
    });
  });

  describe("uploadAvatar", () => {
    it("rejects files with invalid MIME types", async () => {
      const file = new File(["test"], "test.pdf", { type: "application/pdf" });
      const result = await uploadAvatar(file);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid file type");
      }
    });

    it("rejects files that are too large", async () => {
      // Create a file larger than 2 MB
      const largeContent = new Uint8Array(3 * 1024 * 1024);
      const file = new File([largeContent], "large.png", { type: "image/png" });
      const result = await uploadAvatar(file);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("File too large");
      }
    });

    it("accepts valid image files", async () => {
      const content = new Uint8Array([137, 80, 78, 71]); // PNG header
      const file = new File([content], "avatar.png", { type: "image/png" });
      const result = await uploadAvatar(file);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.result.dataUrl).toContain("data:image/png");
        expect(result.result.fileName).toBe("avatar.png");
      }
    });
  });

  describe("removeAvatar", () => {
    it("removes avatar from the stored user", () => {
      // First, simulate a user with an avatar by setting localStorage directly
      const mockUser = {
        id: "user_test",
        email: "test@example.com",
        name: "Test User",
        createdAt: Date.now(),
        avatar: "data:image/png;base64,abc123",
      };
      localStorage.setItem("ict.auth.user", JSON.stringify(mockUser));

      removeAvatar();

      const stored = JSON.parse(
        localStorage.getItem("ict.auth.user") ?? "null",
      );
      expect(stored?.avatar).toBeUndefined();
    });
  });

  describe("getProfile", () => {
    it("returns null when no user is authenticated", () => {
      const profile = getProfile();
      expect(profile).toBeNull();
    });

    it("returns merged user and preferences when authenticated", () => {
      const mockUser = {
        id: "user_test",
        email: "test@example.com",
        name: "Test User",
        createdAt: Date.now(),
      };
      localStorage.setItem("ict.auth.user", JSON.stringify(mockUser));
      updateProfile({ notificationsEnabled: false });

      const profile = getProfile();
      expect(profile).not.toBeNull();
      expect(profile!.name).toBe("Test User");
      expect(profile!.preferences.notificationsEnabled).toBe(false);
    });
  });
});
