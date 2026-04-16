"use client";

import { useActionState } from "react";
import { requestPasswordResetAction } from "@/app/actions/auth";
import { ObfuscatedSupportEmail } from "@/components/auth/ObfuscatedSupportEmail";

export function ForgotPasswordForm({
  initialEmail = "",
}: {
  initialEmail?: string;
}) {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    { ok: false } as { ok: boolean; error?: string; message?: string }
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.ok && state.message && (
        <div className="rounded-lg bg-evergreen-50 border border-evergreen-100 px-4 py-3 text-sm text-evergreen-800 space-y-2">
          <p>{state.message}</p>
          <p>
            Reach out to{" "}
            <ObfuscatedSupportEmail className="font-semibold text-evergreen-700 hover:text-evergreen-800 underline underline-offset-2" />
            {" "}if you need more help.
          </p>
        </div>
      )}
      {state.error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}
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
          defaultValue={initialEmail}
          autoFocus={!initialEmail}
          className="w-full rounded-lg border border-slate-line px-3 py-2.5 text-sm outline-none focus:border-evergreen-500 focus:ring-2 focus:ring-evergreen-100"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-evergreen-500 hover:bg-evergreen-600 disabled:opacity-50 text-white font-semibold text-sm py-2.5 transition"
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
