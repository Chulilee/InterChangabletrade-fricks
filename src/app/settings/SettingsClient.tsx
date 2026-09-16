"use client";

import { useRouter } from "next/navigation";
import { NotificationPreferencesPanel } from "@/components/NotificationPreferences";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";

export function SettingsClient() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useProfile();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-0.5 text-sm text-brand-muted">
          Manage your profile and preferences.
        </p>
      </div>

      {/* Profile quick link */}
      {user && (
        <div className="flex items-center justify-between rounded-2xl border border-brand-muted/20 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border-2 border-brand-muted/30 bg-slate-100">
              {profile?.avatar ? (
                <img
                  src={profile.avatar}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-bold text-slate-400">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{user.name}</p>
              <p className="text-xs text-brand-muted">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push("/profile")}
            className="rounded-lg border border-brand-muted/30 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
         >
            Edit profile
          </button>
        </div>
      )}

      <NotificationPreferencesPanel />
    </div>
  );
}
