"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { resetPasswordAction } from "@/app/actions/auth";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(resetPasswordAction, {
    ok: false,
  } as { ok: boolean; error?: string; message?: string });

  useEffect(() => {
    if (state.ok && state.message) {
      const t = setTimeout(() => {
        router.push(
          `/login?notice=${encodeURIComponent("Password updated. Sign in with your new password.")}`
        );
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state.ok && state.message && (
        <div className="rounded-lg bg-evergreen-50 border border-evergreen-100 px-4 py-3 text-sm text-evergreen-800">
          {state.message}
        </div>
      )}
      {state.error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}
      <label className="block">
        <span className="block text-xs font-mono uppercase tracking-wider text-slate-muted mb-1.5">
          New password
        </span>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          className="w-full rounded-lg border border-slate-line px-3 py-2.5 text-sm outline-none focus:border-evergreen-500 focus:ring-2 focus:ring-evergreen-100"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-evergreen-500 hover:bg-evergreen-600 disabled:opacity-50 text-white font-semibold text-sm py-2.5 transition"
      >
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
