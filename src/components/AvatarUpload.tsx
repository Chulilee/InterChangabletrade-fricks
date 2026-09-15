"use client";

import { useCallback, useRef, useState } from "react";
import { ALLOWED_AVATAR_TYPES, MAX_AVATAR_SIZE } from "@/types/profile";

interface AvatarUploadProps {
  /** Current avatar data URL, if any. */
  currentAvatar?: string;
  /** Callback when a new avatar file is selected (receives the File). */
  onUpload: (file: File) => Promise<boolean>;
  /** Callback when the avatar is removed. */
  onRemove: () => void;
  /** Whether the upload is in progress. */
  isUploading?: boolean;
}

export function AvatarUpload({
  currentAvatar,
  onUpload,
  onRemove,
  isUploading = false,
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setError(null);

      // Validate MIME type
      if (!ALLOWED_AVATAR_TYPES.includes(file.type as (typeof ALLOWED_AVATAR_TYPES)[number])) {
        setError(`Invalid file type. Allowed: ${ALLOWED_AVATAR_TYPES.join(", ")}.`);
        return;
      }

      // Validate size
      if (file.size > MAX_AVATAR_SIZE) {
        const maxMB = (MAX_AVATAR_SIZE / (1024 * 1024)).toFixed(0);
        setError(`File too large. Maximum size is ${maxMB} MB.`);
        return;
      }

      // Generate client-side preview
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload
      const success = await onUpload(file);
      if (!success) {
        setPreview(null);
      }

      // Reset input so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [onUpload],
  );

  const handleRemove = useCallback(() => {
    setPreview(null);
    setError(null);
    onRemove();
  }, [onRemove]);

  const displayAvatar = preview ?? currentAvatar;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Avatar circle */}
      <div className="relative group">
        <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-brand-muted/30 bg-slate-100">
          {displayAvatar ? (
            <img
              src={displayAvatar}
              alt="User avatar"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-slate-400">
              ?
            </div>
          )}
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition group-hover:opacity-100">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="text-xs font-medium text-white transition hover:text-sky-300 disabled:opacity-50"
          >
            {isUploading ? "Uploading…" : "Change"}
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_AVATAR_TYPES.join(",")}
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload avatar"
      />

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="rounded-lg border border-brand-muted/30 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Upload photo
        </button>
        {displayAvatar && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={isUploading}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50 disabled:opacity-50"
          >
            Remove
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
