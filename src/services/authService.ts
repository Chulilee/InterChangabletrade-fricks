"use client";

import type {
  AccountUpdate,
  PasswordChange,
  SignInCredentials,
  SignUpCredentials,
  User,
} from "@/types/auth";

const STORAGE_KEY = "ict.auth.user";
const USERS_KEY = "ict.auth.users";

function getUsers(): Array<User & { password: string }> {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as Array<User & { password: string }>) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: Array<User & { password: string }>): void {
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function setCurrentUser(user: User | null): void {
  if (user) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return `h_${Math.abs(hash).toString(36)}`;
}

export async function signIn(
  credentials: SignInCredentials,
): Promise<{ user: User; error?: never } | { user?: never; error: string }> {
  await new Promise((r) => setTimeout(r, 300));

  const users = getUsers();
  const record = users.find(
    (u) => u.email === credentials.email && u.password === hashPassword(credentials.password),
  );

  if (!record) {
    return { error: "Invalid email or password." };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _hash, ...user } = record;
  setCurrentUser(user);
  return { user };
}

export async function signUp(
  credentials: SignUpCredentials,
): Promise<{ user: User; error?: never } | { user?: never; error: string }> {
  await new Promise((r) => setTimeout(r, 300));

  if (credentials.password !== credentials.confirmPassword) {
    return { error: "Passwords do not match." };
  }

  if (credentials.password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const users = getUsers();
  if (users.some((u) => u.email === credentials.email)) {
    return { error: "An account with this email already exists." };
  }

  const stored: User & { password: string } = {
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    email: credentials.email,
    name: credentials.name,
    createdAt: Date.now(),
    password: hashPassword(credentials.password),
  };

  users.push(stored);
  saveUsers(users);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _hash2, ...publicUser } = stored;
  setCurrentUser(publicUser);
  return { user: publicUser };
}

export async function signOut(): Promise<void> {
  await new Promise((r) => setTimeout(r, 100));
  setCurrentUser(null);
}

export async function requestPasswordReset(
  email: string,
): Promise<{ success: boolean; error?: string }> {
  await new Promise((r) => setTimeout(r, 300));

  const users = getUsers();
  const exists = users.some((u) => u.email === email);

  if (!exists) {
    return { success: true };
  }

  console.log(`[AuthService] Password reset requested for ${email}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Account management
// ---------------------------------------------------------------------------

/**
 * Update the current user's account fields (name, email).
 * Returns the updated user or an error string.
 */
export async function updateAccount(
  update: AccountUpdate,
): Promise<{ user: User; error?: never } | { user?: never; error: string }> {
  await new Promise((r) => setTimeout(r, 300));

  const current = getCurrentUser();
  if (!current) {
    return { error: "You must be signed in." };
  }

  // If email is changing, check for duplicates
  if (update.email && update.email !== current.email) {
    const users = getUsers();
    if (users.some((u) => u.email === update.email)) {
      return { error: "An account with this email already exists." };
    }
  }

  const updated: User = {
    ...current,
    ...(update.name !== undefined && { name: update.name }),
    ...(update.email !== undefined && { email: update.email }),
  };

  setCurrentUser(updated);

  // Also update the users registry so sign-in works with the new email
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === current.id);
  if (idx !== -1) {
    users[idx] = { ...users[idx], ...updated };
    saveUsers(users);
  }

  return { user: updated };
}

/**
 * Change the current user's password.
 * Requires the current (plaintext) password for verification.
 */
export async function changePassword(
  payload: PasswordChange,
): Promise<{ success: true; error?: never } | { success?: never; error: string }> {
  await new Promise((r) => setTimeout(r, 300));

  const current = getCurrentUser();
  if (!current) {
    return { error: "You must be signed in." };
  }

  if (payload.newPassword !== payload.confirmPassword) {
    return { error: "New passwords do not match." };
  }

  if (payload.newPassword.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const users = getUsers();
  const idx = users.findIndex((u) => u.id === current.id);
  if (idx === -1) {
    return { error: "User record not found." };
  }

  if (users[idx].password !== hashPassword(payload.currentPassword)) {
    return { error: "Current password is incorrect." };
  }

  users[idx].password = hashPassword(payload.newPassword);
  saveUsers(users);

  return { success: true };
}

/**
 * Delete the current user's account and all associated data.
 * This is irreversible.
 */
export async function deleteAccount(): Promise<{ success: true; error?: never } | { success?: never; error: string }> {
  await new Promise((r) => setTimeout(r, 300));

  const current = getCurrentUser();
  if (!current) {
    return { error: "You must be signed in." };
  }

  // Remove from users registry
  const users = getUsers();
  const filtered = users.filter((u) => u.id !== current.id);
  saveUsers(filtered);

  // Clear session
  setCurrentUser(null);

  // Clear profile settings
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("ict.profile.settings");
  }

  return { success: true };
}

export function getStoredUser(): User | null {
  return getCurrentUser();
}
