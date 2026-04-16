"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  Library,
  Lightbulb,
  Calendar,
  Palette,
  Archive,
  Settings,
  LogOut,
} from "lucide-react";
import { BrandSwitcher } from "./BrandSwitcher";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  disabled?: boolean;
};

type BrandLite = { id: string; name: string; slug: string };
type UserLite = { name: string | null; email: string | null };

export function Sidebar({
  currentBrand,
  brands,
  user,
  signOutAction,
}: {
  currentBrand: BrandLite | null;
  brands: BrandLite[];
  user: UserLite;
  signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const settingsActive =
    pathname === "/app/settings" || pathname.startsWith("/app/settings/");
  const displayName = user.name?.trim() || user.email?.split("@")[0] || "You";
  const displayEmail = user.email ?? "";

  const nav: NavItem[] = [
    { href: "/app/today", label: "Today", icon: LayoutDashboard },
    { href: "/app/strategy", label: "Strategy", icon: Target },
    { href: "/app/library", label: "Library", icon: Library },
    { href: "/app/learnings", label: "Learnings", icon: Lightbulb },
    { href: "/app/archive", label: "Archive", icon: Archive },
    { href: "/app/schedule", label: "Schedule", icon: Calendar, disabled: true },
    { href: "/app/brand", label: "Brand", icon: Palette },
  ];

  return (
    <aside className="w-[216px] shrink-0 bg-white border-r border-slate-line flex flex-col px-3.5 py-5 gap-1 sticky top-0 self-start h-screen overflow-y-auto">
      <Link
        href="/app/today"
        className="flex items-center gap-2.5 mb-5 px-1.5"
      >
        <Image
          src="/brand/icon-300.png"
          alt="Evergreen"
          width={28}
          height={28}
          priority
        />
        <div className="flex flex-col leading-none">
          <div className="font-display text-[18px] font-semibold text-evergreen-700 tracking-tight">
            Evergreen
          </div>
          <div className="font-sans text-[11px] font-light tracking-[0.2em] text-evergreen-700/80 mt-0.5">
            STUDIO
          </div>
        </div>
      </Link>

      <div className="mb-3.5">
        <BrandSwitcher current={currentBrand} brands={brands} />
      </div>

      <div className="text-[9px] font-mono uppercase tracking-wider text-slate-muted font-semibold px-3 py-1.5">
        Workspace
      </div>

      <nav className="flex flex-col gap-0.5">
        {nav.map(({ href, label, icon: Icon, badge, disabled }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={disabled ? "#" : href}
              aria-disabled={disabled}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition",
                active
                  ? "bg-evergreen-50 text-evergreen-700 font-semibold"
                  : "text-slate-muted hover:bg-slate-bg hover:text-slate-ink",
                disabled && "opacity-40 cursor-not-allowed"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
              {badge ? (
                <span className="ml-auto bg-evergreen-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  {badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 border-t border-slate-line -mx-3.5 px-3.5">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-7 h-7 rounded-full bg-evergreen-100 text-evergreen-700 flex items-center justify-center text-[11px] font-bold shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-semibold text-slate-ink truncate">
              {displayName}
            </div>
            {displayEmail && (
              <div className="text-[10px] text-slate-muted truncate">
                {displayEmail}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <Link
            href="/app/settings"
            className={cn(
              "flex-1 flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition",
              settingsActive
                ? "bg-evergreen-50 text-evergreen-700 font-semibold"
                : "text-slate-muted hover:bg-slate-bg hover:text-slate-ink"
            )}
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span>Settings</span>
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              title="Sign out"
              aria-label="Sign out"
              className="flex items-center justify-center rounded-lg w-9 h-9 text-slate-muted hover:bg-slate-bg hover:text-red-600 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
