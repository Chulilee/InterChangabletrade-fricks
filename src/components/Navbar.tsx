import Link from "next/link";
import { WalletButton } from "@/components/WalletButton";
import { NotificationBell } from "@/components/NotificationBell";

const navLinks = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/analytics", label: "Analytics" },
];

export function Navbar() {
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
                <Link href={link.href} className="transition hover:text-brand-accent">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <NotificationBell />
          <WalletButton />
        </div>
      </nav>
    </header>
  );
}
