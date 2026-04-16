import { UserCog } from "lucide-react";
import { stopImpersonationAction } from "@/app/actions/admin";

export function ImpersonationBanner({
  targetLabel,
  realEmail,
}: {
  targetLabel: string;
  realEmail: string | null;
}) {
  return (
    <div className="bg-amber-500 text-slate-ink border-b border-amber-600 px-5 py-2 flex items-center gap-3 text-sm">
      <UserCog className="w-4 h-4 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="font-semibold">God mode</span>
        <span className="mx-2 opacity-50">·</span>
        <span>
          Acting as <span className="font-semibold">{targetLabel}</span>
        </span>
        {realEmail && (
          <>
            <span className="mx-2 opacity-50">·</span>
            <span className="opacity-70 text-[12px]">
              Signed in as {realEmail}
            </span>
          </>
        )}
      </div>
      <form action={stopImpersonationAction}>
        <button
          type="submit"
          className="rounded-md bg-slate-ink text-white font-semibold text-xs px-3 py-1.5 hover:bg-black transition"
        >
          Exit god mode
        </button>
      </form>
    </div>
  );
}
