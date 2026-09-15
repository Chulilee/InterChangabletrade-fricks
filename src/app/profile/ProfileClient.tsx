"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProfileEdit } from "@/components/ProfileEdit";
import { ProfileView } from "@/components/ProfileView";
import { useProfile } from "@/hooks/useProfile";

export function ProfileClient() {
  const router = useRouter();
  const { profile, isLoading, error, updateProfile, uploadAvatar, removeAvatar, clearError } =
    useProfile();
  const [editing, setEditing] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-sky-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <ProtectedRoute>
        <div className="flex flex-col items-center gap-4 py-16">
          <p className="text-sm text-brand-muted">Please sign in to view your profile.</p>
          <button
            type="button"
            onClick={() => router.push("/sign-in")}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Sign in
          </button>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-col gap-8">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
          <p className="mt-0.5 text-sm text-brand-muted">
            Manage your profile information and preferences.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={clearError}
                className="ml-2 text-red-400 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Profile card */}
        {editing ? (
          <ProfileEdit
            user={profile}
            onSave={updateProfile}
            onUploadAvatar={uploadAvatar}
            onRemoveAvatar={removeAvatar}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <ProfileView user={profile} onEdit={() => setEditing(true)} />
        )}
      </div>
    </ProtectedRoute>
  );
}
