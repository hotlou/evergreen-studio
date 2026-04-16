import Image from "next/image";
import Link from "next/link";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata = { title: "Set new password · Evergreen Studio" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params?.token ?? "";

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

        <div className="rounded-xl border border-slate-line bg-white shadow-soft p-8">
          <h1 className="font-display text-2xl text-slate-ink mb-1">
            Set a new password
          </h1>
          <p className="text-sm text-slate-muted mb-6">
            Choose a password you&apos;ll remember. At least 8 characters.
          </p>

          {token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
              Missing reset token. Please use the link from your email.
            </div>
          )}

          <p className="text-center text-sm text-slate-muted mt-6">
            <Link
              href="/login"
              className="text-evergreen-700 hover:text-evergreen-800 font-semibold"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
