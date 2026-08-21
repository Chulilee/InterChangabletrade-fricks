/**
 * @jest-environment jsdom
 */
import {
  signIn,
  signUp,
  signOut,
  getStoredUser,
  requestPasswordReset,
} from "@/services/authService";

beforeEach(() => {
  localStorage.clear();
});

describe("authService", () => {
  describe("signUp", () => {
    it("should create a new user and store them", async () => {
      const result = await signUp({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        confirmPassword: "password123",
      });

      expect(result.user).toBeDefined();
      expect(result.user!.name).toBe("Test User");
      expect(result.user!.email).toBe("test@example.com");
      expect(result.user!.id).toMatch(/^user_/);
    });

    it("should persist the user in localStorage", async () => {
      await signUp({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        confirmPassword: "password123",
      });

      const user = getStoredUser();
      expect(user).not.toBeNull();
      expect(user!.email).toBe("test@example.com");
    });

    it("should reject mismatched passwords", async () => {
      const result = await signUp({
        name: "Test",
        email: "test@example.com",
        password: "password123",
        confirmPassword: "different123",
      });

      expect(result.error).toBe("Passwords do not match.");
      expect(result.user).toBeUndefined();
    });

    it("should reject short passwords", async () => {
      const result = await signUp({
        name: "Test",
        email: "test@example.com",
        password: "short",
        confirmPassword: "short",
      });

      expect(result.error).toBe("Password must be at least 8 characters.");
    });

    it("should reject duplicate emails", async () => {
      await signUp({
        name: "User 1",
        email: "dup@example.com",
        password: "password123",
        confirmPassword: "password123",
      });

      const result = await signUp({
        name: "User 2",
        email: "dup@example.com",
        password: "password456",
        confirmPassword: "password456",
      });

      expect(result.error).toBe("An account with this email already exists.");
    });
  });

  describe("signIn", () => {
    it("should sign in with valid credentials", async () => {
      await signUp({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        confirmPassword: "password123",
      });

      const result = await signIn({
        email: "test@example.com",
        password: "password123",
      });

      expect(result.user).toBeDefined();
      expect(result.user!.email).toBe("test@example.com");
    });

    it("should reject wrong password", async () => {
      await signUp({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        confirmPassword: "password123",
      });

      const result = await signIn({
        email: "test@example.com",
        password: "wrongpassword",
      });

      expect(result.error).toBe("Invalid email or password.");
      expect(result.user).toBeUndefined();
    });

    it("should reject non-existent email", async () => {
      const result = await signIn({
        email: "nobody@example.com",
        password: "password123",
      });

      expect(result.error).toBe("Invalid email or password.");
    });
  });

  describe("signOut", () => {
    it("should clear the stored user", async () => {
      await signUp({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        confirmPassword: "password123",
      });

      expect(getStoredUser()).not.toBeNull();

      await signOut();

      expect(getStoredUser()).toBeNull();
    });
  });

  describe("requestPasswordReset", () => {
    it("should always return success", async () => {
      const result = await requestPasswordReset("nobody@example.com");
      expect(result.success).toBe(true);
    });

    it("should return success for existing email", async () => {
      await signUp({
        name: "Test",
        email: "test@example.com",
        password: "password123",
        confirmPassword: "password123",
      });

      const result = await requestPasswordReset("test@example.com");
      expect(result.success).toBe(true);
    });
  });
});
