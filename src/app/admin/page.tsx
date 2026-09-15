import type { Metadata } from 'next';
import { AdminDashboardClient } from './AdminDashboardClient';

export const metadata: Metadata = {
  title: 'Admin dashboard | InterChangableTrade',
  description: 'User management, listing moderation and dispute resolution.',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Admin dashboard</h1>
        <p className="mt-0.5 text-sm text-brand-muted">
          Moderate listings, manage users and resolve disputes. All actions are
          recorded in the audit log.
        </p>
      </div>
      <AdminDashboardClient />
    </section>
  );
}
