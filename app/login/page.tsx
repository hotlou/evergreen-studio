import Image from "next/image";
import Link from "next/link";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Sign in · Evergreen Studio" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const from = params?.from ?? "/app/today";
  const error = params?.error;
  const notice = params?.notice;

  async function signInAction(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    try {
      await signIn("credentials", { email, password, redirectTo: from });
    } catch (err) {
      if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
      if (err && typeof err === "object" && "digest" in err) {
        const digest = (err as { digest?: string }).digest;
        if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw err;
      }
      const msg =
        err instanceof AuthError
          ? "Invalid email or password."
          : err instanceof Error
          ? err.message
          : "Unknown error";
      redirect(`/login?error=${encodeURIComponent(msg)}&from=${encodeURIComponent(from)}`);
    }
  }

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
            Sign in
          </h1>
          <p className="text-sm text-slate-muted mb-6">
            Welcome back. Sign in to your workspace.
          </p>

          {notice && (
            <div className="mb-4 rounded-lg bg-evergreen-50 border border-evergreen-100 px-4 py-3 text-sm text-evergreen-800">
              {notice}
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

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
                className="w-full rounded-lg border border-slate-line px-3 py-2.5 text-sm outline-none focus:border-evergreen-500 focus:ring-2 focus:ring-evergreen-100"
              />
            </label>
            <label className="block">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-muted">
                  Password
                </span>
                <Link
                  href="/forgot-password"
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

          <p className="text-center text-sm text-slate-muted mt-6">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-evergreen-700 hover:text-evergreen-800 font-semibold"
            >
              Create one
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-slate-muted mt-6 font-mono uppercase tracking-wider">
          Evergreen Studio · v0.1
        </p>
      </div>
    </main>
  );
}
