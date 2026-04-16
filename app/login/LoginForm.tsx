"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function LoginForm({
  signInAction,
}: {
  signInAction: (formData: FormData) => Promise<void>;
}) {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");

  const forgotHref = email
    ? `/forgot-password?email=${encodeURIComponent(email)}`
    : "/forgot-password";

  return (
    <form action={signInAction} className="space-y-4">
      <label className="block">
        <span className="block text-xs font-mono uppercase tracking-wider text-slate-muted mb-1.5">
          Email
        </span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-line px-3 py-2.5 text-sm outline-none focus:border-evergreen-500 focus:ring-2 focus:ring-evergreen-100"
        />
      </label>
      <label className="block">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-muted">
            Password
          </span>
          {/* tabIndex={-1} keeps this out of the Email → Password → Sign-in tab chain. */}
          <Link
            href={forgotHref}
            tabIndex={-1}
            className="text-xs text-evergreen-700 hover:text-evergreen-800 font-semibold"
          >
            Forgot?
          </Link>
        </div>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-slate-line px-3 py-2.5 text-sm outline-none focus:border-evergreen-500 focus:ring-2 focus:ring-evergreen-100"
        />
      </label>
      <button
        type="submit"
        className="w-full rounded-lg bg-evergreen-500 hover:bg-evergreen-600 text-white font-semibold text-sm py-2.5 transition"
      >
        Sign in
      </button>
    </form>
  );
}
