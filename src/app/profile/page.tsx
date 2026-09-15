import type { Metadata } from "next";
import { ProfileClient } from "./ProfileClient";

export const metadata: Metadata = {
  title: "Profile · InterChangableTrade",
  description: "View and manage your user profile.",
};

/** Profile page — delegates to a client component for interactivity. */
export default function ProfilePage() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-10">
      <ProfileClient />
    </section>
  );
}
