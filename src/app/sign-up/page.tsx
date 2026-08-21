import type { Metadata } from "next";
import { SignUpForm } from "@/components/SignUpForm";

export const metadata: Metadata = {
  title: "Create Account - InterChangableTrade",
  description: "Create an InterChangableTrade account to start trading.",
};

export default function SignUpPage() {
  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Create an account
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Join InterChangableTrade to trade tokenized assets on Stellar.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <SignUpForm />
        </div>
      </div>
    </div>
  );
}
