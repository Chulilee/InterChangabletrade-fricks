import type { Metadata } from "next";
import { NotificationsClient } from "./NotificationsClient";

export const metadata: Metadata = {
  title: "Notifications · InterChangableTrade",
  description: "View and manage your in-app notifications.",
};

/** Notifications page — delegates to a client component for interactivity. */
export default function NotificationsPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-10">
      <NotificationsClient />
    </section>
  );
}
