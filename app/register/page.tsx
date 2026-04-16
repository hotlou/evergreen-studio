import Image from "next/image";
import Link from "next/link";
import { RegisterForm } from "./RegisterForm";

export const metadata = { title: "Create account · Evergreen Studio" };

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-slate-bg flex items-center justify-center px-6 py-10">
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
            Create your account
          </h1>
          <p className="text-sm text-slate-muted mb-6">
            Takes about 30 seconds. We&apos;ll spin up your workspace automatically.
          </p>

          <RegisterForm />

          <p className="text-center text-sm text-slate-muted mt-6">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-evergreen-700 hover:text-evergreen-800 font-semibold"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
