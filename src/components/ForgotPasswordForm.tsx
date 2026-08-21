"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/services/authService";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await requestPasswordReset(email);
    setIsLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-sky-600">
          <svg
            className="h-7 w-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900">Check your email</h2>
        <p className="max-w-xs text-sm text-slate-500">
          If an account exists for {email}, we sent a password reset link.
        </p>
        <Link
          href="/sign-in"
          className="mt-2 text-sm font-medium text-sky-600 hover:text-sky-500"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <p className="text-sm text-slate-600">
        Enter your email address and we will send you a link to reset your
        password.
      </p>

      <div>
        <label
          htmlFor="reset-email"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Email address
        </label>
        <input
          id="reset-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:opacity-60"
      >
        {isLoading ? "Sending..." : "Send reset link"}
      </button>

      <p className="text-center text-sm text-slate-500">
        Remember your password?{" "}
        <Link
          href="/sign-in"
          className="font-medium text-sky-600 hover:text-sky-500"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
