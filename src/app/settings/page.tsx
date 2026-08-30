import type { Metadata } from "next";
import { SettingsClient } from "./SettingsClient";

export const metadata: Metadata = {
  title: "Settings · InterChangableTrade",
  description: "Manage your notification and email preferences.",
};

/** Settings page — delegates to a client component for interactivity. */
export default function SettingsPage() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-10">
      <SettingsClient />
    </section>
  );
}
