"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { WalletButton } from "@/components/WalletButton";
import { NotificationBell } from "@/components/NotificationBell";

const navLinks = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/analytics", label: "Analytics" },
];

export function Navbar() {
  const { isAuthenticated, user, signOut } = useAuth();

  return (
    <header className="border-b border-brand-muted/20">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          InterChangable<span className="text-brand-accent">Trade</span>
        </Link>
        <div className="flex items-center gap-6">
          <ul className="hidden items-center gap-6 text-sm font-medium text-brand-muted sm:flex">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="transition hover:text-brand-accent"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <NotificationBell />
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-brand-muted sm:inline">
                {user?.name}
              </span>
              <button
                onClick={() => void signOut()}
                className="rounded-lg border border-brand-accent/40 px-3 py-2 text-sm font-medium text-brand-accent transition hover:bg-brand-accent/10"
              >
                Sign out
              </button>
              <WalletButton />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/sign-in"
                className="rounded-lg px-3 py-2 text-sm font-medium text-brand-muted transition hover:text-brand-accent"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
