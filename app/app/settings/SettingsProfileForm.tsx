"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/app/actions/account";

export function SettingsProfileForm({
  initialName,
  initialEmail,
  emailVerified,
}: {
  initialName: string;
  initialEmail: string;
  emailVerified: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateProfileAction, {
    ok: false,
  } as { ok: boolean; error?: string; message?: string });

  return (
    <form action={formAction} className="space-y-4">
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
          Name
        </span>
        <input
          type="text"
          name="name"
          required
          defaultValue={initialName}
          autoComplete="name"
          className="w-full rounded-lg border border-slate-line px-3 py-2.5 text-sm outline-none focus:border-evergreen-500 focus:ring-2 focus:ring-evergreen-100"
        />
      </label>

      <label className="block">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-muted">
            Email
          </span>
          <span
            className={
              emailVerified
                ? "text-[10px] font-mono uppercase tracking-wider text-evergreen-700 font-semibold"
                : "text-[10px] font-mono uppercase tracking-wider text-slate-muted font-semibold"
            }
          >
            {emailVerified ? "Verified" : "Unverified"}
          </span>
        </div>
        <input
          type="email"
          name="email"
          required
          defaultValue={initialEmail}
          autoComplete="email"
          className="w-full rounded-lg border border-slate-line px-3 py-2.5 text-sm outline-none focus:border-evergreen-500 focus:ring-2 focus:ring-evergreen-100"
        />
      </label>

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-evergreen-500 hover:bg-evergreen-600 disabled:opacity-50 text-white font-semibold text-sm px-4 py-2.5 transition"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
