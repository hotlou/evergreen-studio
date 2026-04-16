"use client";

import { useTransition } from "react";
import { CheckCircle2, Circle, UserCog } from "lucide-react";
import {
  startImpersonationAction,
  stopImpersonationAction,
} from "@/app/actions/admin";

function formatJoined(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AdminUserRow({
  userId,
  name,
  email,
  emailVerified,
  hasPassword,
  brandCount,
  createdAt,
  isSelf,
  isCurrentTarget,
}: {
  userId: string;
  name: string | null;
  email: string | null;
  emailVerified: boolean;
  hasPassword: boolean;
  brandCount: number;
  createdAt: string;
  isSelf: boolean;
  isCurrentTarget: boolean;
}) {
  const [pending, start] = useTransition();

  const displayName = name?.trim() || email?.split("@")[0] || "—";
  const initial = displayName.charAt(0).toUpperCase();

  function handleActAs() {
    start(async () => {
      await startImpersonationAction(userId);
    });
  }

  function handleStop() {
    start(async () => {
      await stopImpersonationAction();
    });
  }

  return (
    <div className="grid grid-cols-[1fr_1.2fr_90px_90px_140px] items-center gap-4 px-5 py-3 border-b border-slate-line last:border-b-0 text-sm">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full bg-evergreen-100 text-evergreen-700 flex items-center justify-center text-[11px] font-bold shrink-0">
          {initial}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-slate-ink truncate flex items-center gap-1.5">
            {displayName}
            {isSelf && (
              <span className="text-[9px] font-mono uppercase tracking-wider text-evergreen-700 font-bold">
                you
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-muted font-mono">
            {hasPassword ? (
              <CheckCircle2 className="w-3 h-3 text-evergreen-600" />
            ) : (
              <Circle className="w-3 h-3 text-slate-line" />
            )}
            <span>password</span>
            <span className="mx-1">·</span>
            {emailVerified ? (
              <CheckCircle2 className="w-3 h-3 text-evergreen-600" />
            ) : (
              <Circle className="w-3 h-3 text-slate-line" />
            )}
            <span>verified</span>
          </div>
        </div>
      </div>

      <div className="text-slate-muted truncate text-[13px]">{email}</div>
      <div className="text-slate-ink tabular-nums">{brandCount}</div>
      <div className="text-slate-muted text-[12px]">{formatJoined(createdAt)}</div>

      <div className="flex items-center justify-end gap-2">
        {isCurrentTarget ? (
          <button
            type="button"
            onClick={handleStop}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-evergreen-500 bg-evergreen-50 text-evergreen-700 font-semibold text-xs px-3 py-1.5 transition hover:bg-evergreen-100 disabled:opacity-60"
          >
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={handleActAs}
            disabled={pending || isSelf}
            title={isSelf ? "This is you" : "Act as this user"}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-line text-slate-ink hover:bg-slate-bg font-semibold text-xs px-3 py-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <UserCog className="w-3.5 h-3.5" /> Act as
          </button>
        )}
      </div>
    </div>
  );
}
