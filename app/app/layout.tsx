import { redirect } from "next/navigation";
import { Sidebar } from "@/components/shell/Sidebar";
import { ImpersonationBanner } from "@/components/shell/ImpersonationBanner";
import { getBrandContext } from "@/lib/brand";
import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { signOutAction } from "@/app/actions/account";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getBrandContext();
  if (!ctx) redirect("/login");

  // Pull session separately to get impersonation info and real-caller email
  // (so we can show the Admin entry only to the actual admin, not to whoever
  // they're currently acting as).
  const session = await auth();
  const impersonating = session?.impersonating ?? null;
  const showAdminLink = isAdminEmail(
    impersonating?.realEmail ?? ctx.user.email
  );

  const brandsLite = ctx.brands.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
  }));

  const currentLite = ctx.currentBrand
    ? {
        id: ctx.currentBrand.id,
        name: ctx.currentBrand.name,
        slug: ctx.currentBrand.slug,
      }
    : null;

  const targetLabel =
    (ctx.user.name?.trim() || ctx.user.email?.split("@")[0] || ctx.user.email) ??
    "user";

  return (
    <div className="min-h-screen bg-slate-bg">
      {impersonating && (
        <ImpersonationBanner
          targetLabel={targetLabel}
          realEmail={impersonating.realEmail}
        />
      )}
      <div className="flex min-h-screen">
        <Sidebar
          currentBrand={currentLite}
          brands={brandsLite}
          user={{ name: ctx.user.name, email: ctx.user.email }}
          signOutAction={signOutAction}
          showAdminLink={showAdminLink}
        />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
