"use client";

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { PrivacySettings } from "@/components/settings/PrivacySettings";
import { DisplaySettings } from "@/components/settings/DisplaySettings";
import { NotificationPreferencesPanel } from "@/components/NotificationPreferences";

// ---------------------------------------------------------------------------
// Section definitions
// ---------------------------------------------------------------------------

type SectionId = "account" | "privacy" | "notifications" | "display";

const SECTIONS: { id: SectionId; label: string; icon: React.ReactNode }[] = [
  { id: "account", label: "Account", icon: <UserIcon /> },
  { id: "privacy", label: "Privacy", icon: <ShieldIcon /> },
  { id: "notifications", label: "Notifications", icon: <BellIcon /> },
  { id: "display", label: "Display", icon: <PaletteIcon /> },
];

// ---------------------------------------------------------------------------
// SettingsClient
// ---------------------------------------------------------------------------

export function SettingsClient() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [activeSection, setActiveSection] = useState<SectionId>("account");

  // Intersection observer refs for scroll tracking
  const sectionRefs = useRef<Record<SectionId, HTMLDivElement | null>>({
    account: null,
    privacy: null,
    notifications: null,
    display: null,
  });

  // Track scroll position to highlight active section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("data-section") as SectionId | null;
            if (id) setActiveSection(id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 },
    );

    const refs = sectionRefs.current;
    Object.values(refs).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollTo = useCallback((id: SectionId) => {
    setActiveSection(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  if (!user) {
    return (
      <ProtectedRoute>
        <div className="flex flex-col items-center gap-4 py-16">
          <p className="text-sm text-brand-muted">Please sign in to access settings.</p>
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Settings</h1>
          <p className="mt-0.5 text-sm text-brand-muted dark:text-slate-400">
            Manage your account, privacy, notifications, and display preferences.
          </p>
        </div>

        {/* Two-column layout: sticky nav + content */}
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
          {/* Sticky sidebar nav */}
          <nav className="lg:sticky lg:top-24 lg:w-48 lg:flex-shrink-0">
            <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => scrollTo(section.id)}
                    className={`flex w-full items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                      activeSection === section.id
                        ? "bg-brand-accent/10 text-brand-accent dark:bg-brand-accent/20"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    }`}
                  >
                    {section.icon}
                    {section.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Content sections */}
          <div className="flex min-w-0 flex-1 flex-col gap-10">
            <SectionWrapper
              id="account"
              ref={(el) => { sectionRefs.current.account = el; }}
            >
              <AccountSettings />
            </SectionWrapper>

            <SectionWrapper
              id="privacy"
              ref={(el) => { sectionRefs.current.privacy = el; }}
            >
              <PrivacySettings />
            </SectionWrapper>

            <SectionWrapper
              id="notifications"
              ref={(el) => { sectionRefs.current.notifications = el; }}
            >
              <NotificationPreferencesPanel />
            </SectionWrapper>

            <SectionWrapper
              id="display"
              ref={(el) => { sectionRefs.current.display = el; }}
            >
              <DisplaySettings />
            </SectionWrapper>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

// ---------------------------------------------------------------------------
// Section wrapper with forwardRef for IntersectionObserver
// ---------------------------------------------------------------------------

const SectionWrapper = forwardRef<
  HTMLDivElement,
  { id: SectionId; children: React.ReactNode }
>(function SectionWrapper({ id, children }, ref) {
  return (
    <div ref={ref} data-section={id} className="scroll-mt-24">
      {children}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Icons (inline SVG, consistent with existing lucide-react style)
// ---------------------------------------------------------------------------

function UserIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function PaletteIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="8" r="1.5" fill="currentColor" />
      <circle cx="8" cy="12" r="1.5" fill="currentColor" />
      <circle cx="16" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="16" r="1.5" fill="currentColor" />
    </svg>
  );
}
