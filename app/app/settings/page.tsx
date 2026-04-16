import { redirect } from "next/navigation";
import { CreditCard, Zap, ChevronRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { signOutAction } from "@/app/actions/account";
import { SettingsProfileForm } from "./SettingsProfileForm";

export const metadata = { title: "Settings · Evergreen Studio" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, emailVerified: true },
  });
  if (!me) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl text-slate-ink tracking-tight">
            Settings
          </h1>
          <p className="text-sm text-slate-muted mt-1">
            Your account, billing, and workspace preferences.
          </p>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-lg border border-slate-line text-slate-muted hover:text-red-600 hover:border-red-200 hover:bg-red-50 font-semibold text-xs px-3 py-2 transition"
          >
            Sign out
          </button>
        </form>
      </div>

      <section className="mb-10">
        <h2 className="text-[10px] font-mono uppercase tracking-wider text-slate-muted font-semibold mb-3">
          Account
        </h2>
        <div className="rounded-xl border border-slate-line bg-white shadow-soft p-6">
          <SettingsProfileForm
            initialName={me.name ?? ""}
            initialEmail={me.email ?? ""}
            emailVerified={!!me.emailVerified}
          />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-[10px] font-mono uppercase tracking-wider text-slate-muted font-semibold mb-3">
          Billing & plan
        </h2>
        <div className="rounded-xl border border-slate-line bg-white shadow-soft divide-y divide-slate-line">
          <ComingSoonRow
            icon={CreditCard}
            title="Billing"
            description="Payment method, invoices, and receipts."
          />
          <ComingSoonRow
            icon={Zap}
            title="Plan"
            description="Choose a plan and manage usage limits."
          />
        </div>
      </section>
    </div>
  );
}

function ComingSoonRow({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <div className="w-9 h-9 rounded-lg bg-slate-bg flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-slate-muted" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-ink">{title}</div>
        <div className="text-xs text-slate-muted">{description}</div>
      </div>
      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-muted font-semibold">
        Soon
      </span>
      <ChevronRight className="w-4 h-4 text-slate-line" />
    </div>
  );
}
