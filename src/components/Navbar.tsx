"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useWallet } from "@/hooks/useWallet";
import { accountExplorerUrl } from "@/lib/stellar/config";
import { WalletButton } from "@/components/WalletButton";
import { NotificationBell } from "@/components/NotificationBell";

const navLinks = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/analytics", label: "Analytics" },
];

/**
 * Live wallet status for the navigation bar.
 *
 * It reads the shared wallet context, so it always shows the same
 * connection state as the wallet button next to it and updates as soon as
 * the wallet connects or disconnects.
 */
function WalletStatus() {
  const { isConnected, address } = useWallet();

  if (!isConnected || !address) return null;

  return (
    <a
      href={accountExplorerUrl(address)}
      target="_blank"
      rel="noopener noreferrer"
      title={`View ${address} on stellar.expert`}
      className="hidden items-center gap-1.5 text-xs font-medium text-brand-muted md:inline-flex"
    >
      <span
        className="h-2 w-2 rounded-full bg-emerald-400"
        aria-hidden="true"
      />
      Wallet connected
    </a>
  );
}

export function Navbar() {
  const { isAuthenticated, user, signOut } = useAuth();
  const { profile } = useProfile();

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
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link
                  href="/profile"
                  className="hidden items-center gap-2 transition hover:text-brand-accent sm:flex"
                >
                  <div className="h-6 w-6 flex-shrink-0 overflow-hidden rounded-full border border-brand-muted/30 bg-slate-100">
                    {profile?.avatar ? (
                      <img
                        src={profile.avatar}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-slate-400">
                        {user?.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="hidden text-xs text-brand-muted sm:inline">
                    {user?.name}
                  </span>
                </Link>
                <button
                  onClick={() => void signOut()}
                  className="rounded-lg border border-brand-accent/40 px-3 py-2 text-sm font-medium text-brand-accent transition hover:bg-brand-accent/10"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
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
              </>
            )}
            <WalletStatus />
            <WalletButton />
          </div>
        </div>
      </nav>
    </header>
  );
}
