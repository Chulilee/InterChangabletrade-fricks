"use client";

import { AuthProvider } from "@/hooks/useAuth";
import { WalletProvider } from "@/hooks/useWallet";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <WalletProvider>{children}</WalletProvider>
    </AuthProvider>
  );
}
