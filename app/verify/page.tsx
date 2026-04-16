import Image from "next/image";
import Link from "next/link";
import { verifyEmailAction } from "@/app/actions/auth";

export const metadata = { title: "Verify email · Evergreen Studio" };

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params?.token ?? "";

  const result = token
    ? await verifyEmailAction(token)
    : { ok: false, error: "Missing verification token." };

  return (
    <main className="min-h-screen bg-slate-bg flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-10">
          <Image
            src="/brand/icon-300.png"
            alt="Evergreen"
            width={44}
            height={44}
            priority
          />
          <div className="flex flex-col leading-none">
            <div className="font-display text-2xl text-slate-ink tracking-tight">
              Evergreen
            </div>
            <div className="font-sans text-[14px] font-light tracking-[0.2em] text-slate-ink/75 mt-0.5">
              STUDIO
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-line bg-white shadow-soft p-8 text-center">
          {result.ok ? (
            <>
              <h1 className="font-display text-2xl text-slate-ink mb-2">
                Email confirmed
              </h1>
              <p className="text-sm text-slate-muted mb-6">
                Thanks for verifying your email. You&apos;re all set.
              </p>
              <Link
                href="/app/today"
                className="inline-block rounded-lg bg-evergreen-500 hover:bg-evergreen-600 text-white font-semibold text-sm px-4 py-2.5 transition"
              >
                Open Studio
              </Link>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl text-slate-ink mb-2">
                Couldn&apos;t verify
              </h1>
              <p className="text-sm text-slate-muted mb-6">{result.error}</p>
              <Link
                href="/login"
                className="inline-block rounded-lg border border-slate-line px-4 py-2.5 text-sm font-semibold text-slate-ink hover:bg-slate-bg transition"
              >
                Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
