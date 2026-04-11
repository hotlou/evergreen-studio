import { redirect } from "next/navigation";
import { Sidebar } from "@/components/shell/Sidebar";
import { getBrandContext } from "@/lib/brand";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getBrandContext();
  if (!ctx) redirect("/login");

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

  return (
    <div className="flex min-h-screen bg-slate-bg">
      <Sidebar currentBrand={currentLite} brands={brandsLite} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
