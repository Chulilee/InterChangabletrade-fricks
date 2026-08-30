"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { usePreferences } from "@/hooks/usePreferences";
import {
  updateAccount,
  changePassword,
  deleteAccount,
} from "@/services/authService";
import type { PasswordChange } from "@/types/auth";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "zh", label: "中文" },
  { value: "ja", label: "日本語" },
] as const;

export function AccountSettings() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { preferences, updatePreferences } = usePreferences();

  // Account fields
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [language, setLanguage] = useState(preferences.language);
  const [accountSaved, setAccountSaved] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [isSavingAccount, setIsSavingAccount] = useState(false);

  // Password change
  const [showPassword, setShowPassword] = useState(false);
  const [passwords, setPasswords] = useState<PasswordChange>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // -----------------------------------------------------------------------
  // Account save
  // -----------------------------------------------------------------------

  const handleSaveAccount = useCallback(async () => {
    setAccountError(null);
    if (!name.trim()) {
      setAccountError("Name is required.");
      return;
    }

    setIsSavingAccount(true);

    // Update auth-level fields (name, email)
    if (name.trim() !== user?.name || email !== user?.email) {
      const result = await updateAccount({
        name: name.trim(),
        email: email !== user?.email ? email : undefined,
      });
      if (result.error) {
        setAccountError(result.error);
        setIsSavingAccount(false);
        return;
      }
    }

    // Update preference-level fields (language)
    if (language !== preferences.language) {
      await updatePreferences({ language });
    }

    setIsSavingAccount(false);
    setAccountSaved(true);
    setTimeout(() => setAccountSaved(false), 2000);
  }, [name, email, language, user, preferences, updatePreferences]);

  // -----------------------------------------------------------------------
  // Password change
  // -----------------------------------------------------------------------

  const handleChangePassword = useCallback(async () => {
    setPasswordError(null);
    if (!passwords.currentPassword) {
      setPasswordError("Current password is required.");
      return;
    }
    if (passwords.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setIsChangingPassword(true);
    const result = await changePassword(passwords);
    setIsChangingPassword(false);

    if (result.error) {
      setPasswordError(result.error);
      return;
    }

    setPasswordSaved(true);
    setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setTimeout(() => setPasswordSaved(false), 2000);
  }, [passwords]);

  // -----------------------------------------------------------------------
  // Delete account
  // -----------------------------------------------------------------------

  const handleDeleteAccount = useCallback(async () => {
    setDeleteError(null);
    if (deleteInput !== "DELETE") {
      setDeleteError("Type DELETE to confirm.");
      return;
    }

    setIsDeleting(true);
    const result = await deleteAccount();
    setIsDeleting(false);

    if (result.error) {
      setDeleteError(result.error);
      return;
    }

    await signOut();
    router.push("/");
  }, [deleteInput, signOut, router]);

  if (!user) return null;

  return (
    <div className="flex flex-col gap-8">
      {/* ------------------------------------------------------------------ */}
      {/* Account details                                                     */}
      {/* ------------------------------------------------------------------ */}
      <SettingsCard title="Account Details" subtitle="Manage your name, email, and language.">
        {accountError && (
          <ErrorBanner message={accountError} onDismiss={() => setAccountError(null)} />
        )}

        <FieldGroup>
          <Field label="Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Language">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={inputClass}
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </Field>
        </FieldGroup>

        <div className="flex items-center gap-3">
          <PrimaryButton onClick={handleSaveAccount} disabled={isSavingAccount}>
            {accountSaved ? "✓ Saved" : isSavingAccount ? "Saving…" : "Save changes"}
          </PrimaryButton>
        </div>
      </SettingsCard>

      {/* ------------------------------------------------------------------ */}
      {/* Change password                                                     */}
      {/* ------------------------------------------------------------------ */}
      <SettingsCard title="Change Password" subtitle="Update your account password.">
        {passwordError && (
          <ErrorBanner message={passwordError} onDismiss={() => setPasswordError(null)} />
        )}

        <FieldGroup>
          <Field label="Current password">
            <input
              type={showPassword ? "text" : "password"}
              value={passwords.currentPassword}
              onChange={(e) =>
                setPasswords((p) => ({ ...p, currentPassword: e.target.value }))
              }
              className={inputClass}
            />
          </Field>
          <Field label="New password">
            <input
              type={showPassword ? "text" : "password"}
              value={passwords.newPassword}
              onChange={(e) =>
                setPasswords((p) => ({ ...p, newPassword: e.target.value }))
              }
              className={inputClass}
            />
          </Field>
          <Field label="Confirm new password">
            <input
              type={showPassword ? "text" : "password"}
              value={passwords.confirmPassword}
              onChange={(e) =>
                setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))
              }
              className={inputClass}
            />
          </Field>
        </FieldGroup>

        <div className="flex items-center gap-3">
          <PrimaryButton onClick={handleChangePassword} disabled={isChangingPassword}>
            {passwordSaved ? "✓ Password changed" : isChangingPassword ? "Changing…" : "Change password"}
          </PrimaryButton>
          <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600"
            />
            Show passwords
          </label>
        </div>
      </SettingsCard>

      {/* ------------------------------------------------------------------ */}
      {/* Danger zone                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-2xl border border-red-200 bg-red-50/50 p-6 shadow-sm dark:border-red-900/50 dark:bg-red-950/20">
        <h3 className="font-semibold text-red-700 dark:text-red-400">Danger Zone</h3>
        <p className="mt-1 text-sm text-red-600/80 dark:text-red-400/70">
          Deleting your account is permanent and cannot be undone. All data
          associated with your account will be removed.
        </p>

        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="mt-4 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
          >
            Delete account
          </button>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {deleteError && (
              <ErrorBanner message={deleteError} onDismiss={() => setDeleteError(null)} />
            )}
            <p className="text-sm text-red-600 dark:text-red-400">
              Type <strong>DELETE</strong> to confirm:
            </p>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="DELETE"
              className="w-full max-w-xs rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-red-300 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:border-red-800 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-red-700"
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteInput !== "DELETE"}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting ? "Deleting…" : "Permanently delete account"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteInput("");
                  setDeleteError(null);
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared UI primitives
// ---------------------------------------------------------------------------

function SettingsCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-brand-muted/20 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="mt-0.5 text-sm text-brand-muted dark:text-slate-400">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-4">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function ErrorBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
      <span>{message}</span>
      <button type="button" onClick={onDismiss} className="ml-2 text-red-400 hover:text-red-600">
        ✕
      </button>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-brand-muted/30 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-brand-muted focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-accent";
