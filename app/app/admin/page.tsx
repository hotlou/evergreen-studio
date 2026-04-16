import { redirect } from "next/navigation";
import { Shield } from "lucide-react";
import { authReal } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdminEmail } from "@/lib/admin";
import { getImpersonation } from "@/lib/impersonation";
import { AdminUserRow } from "./AdminUserRow";

export const metadata = { title: "Admin · Evergreen Studio" };

export default async function AdminPage() {
  const session = await authReal();
  if (!session?.user?.id) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true },
  });
  if (!me?.email || !isAdminEmail(me.email)) {
    redirect("/app/today");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      createdAt: true,
      passwordHash: true,
      memberships: {
        select: {
          workspace: {
            select: {
              id: true,
              name: true,
              _count: { select: { brands: true } },
            },
          },
        },
      },
    },
  });

  const imp = await getImpersonation();
  const currentlyActingOnId =
    imp && imp.admin === me.id ? imp.target : null;

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-5 h-5 text-evergreen-600" />
        <span className="text-[10px] font-mono uppercase tracking-wider text-evergreen-700 font-bold">
          God mode
        </span>
      </div>
      <h1 className="font-display text-3xl text-slate-ink tracking-tight">
        Admin
      </h1>
      <p className="text-sm text-slate-muted mt-1 mb-8">
        Platform-wide user list. Click &ldquo;Act as&rdquo; to load the app
        as that user without logging out of your own account.
      </p>

      <div className="rounded-xl border border-slate-line bg-white shadow-soft overflow-hidden">
        <div className="grid grid-cols-[1fr_1.2fr_90px_90px_140px] items-center gap-4 px-5 py-3 border-b border-slate-line bg-slate-bg/60 text-[10px] font-mono uppercase tracking-wider text-slate-muted font-semibold">
          <div>User</div>
          <div>Email</div>
          <div>Brands</div>
          <div>Joined</div>
          <div />
        </div>
        {users.length === 0 && (
          <div className="px-5 py-10 text-center text-sm text-slate-muted">
            No users yet.
          </div>
        )}
        {users.map((u) => {
          const brandCount = u.memberships.reduce(
            (n, m) => n + (m.workspace?._count.brands ?? 0),
            0
          );
          return (
            <AdminUserRow
              key={u.id}
              userId={u.id}
              name={u.name}
              email={u.email}
              emailVerified={!!u.emailVerified}
              hasPassword={!!u.passwordHash}
              brandCount={brandCount}
              createdAt={u.createdAt.toISOString()}
              isSelf={u.id === me.id}
              isCurrentTarget={currentlyActingOnId === u.id}
            />
          );
        })}
      </div>
    </div>
  );
}
