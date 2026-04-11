import Image from "next/image";
import { signIn } from "@/lib/auth";

export const metadata = { title: "Sign in · Evergreen Studio" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const params = await searchParams;
  const from = params?.from ?? "/app/today";

  async function signInAction(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    await signIn("credentials", { email, redirectTo: from });
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
          <div className="font-display text-2xl text-slate-ink tracking-tight">
            Evergreen
          </div>
        </div>

        <div className="rounded-xl border border-slate-line bg-white shadow-soft p-8">
          <h1 className="font-display text-2xl text-slate-ink mb-1">
            Sign in
          </h1>
          <p className="text-sm text-slate-muted mb-6">
            Dev mode — any email works. We&apos;ll create your workspace on first sign-in.
          </p>

          <form action={signInAction} className="space-y-4">
            <label className="block">
              <span className="block text-xs font-mono uppercase tracking-wider text-slate-muted mb-1.5">
                Email
              </span>
              <input
                type="email"
                name="email"
                required
                placeholder="you@example.com"
                className="w-full rounded-lg border border-slate-line px-3 py-2.5 text-sm outline-none focus:border-evergreen-500 focus:ring-2 focus:ring-evergreen-100"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-lg bg-evergreen-500 hover:bg-evergreen-600 text-white font-semibold text-sm py-2.5 transition"
            >
              Continue
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-muted mt-6 font-mono uppercase tracking-wider">
          EverGreen Studio · v0.1
        </p>
      </div>
    </main>
  );
}
