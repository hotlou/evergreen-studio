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

export function Sidebar({
  currentBrand,
  brands,
}: {
  currentBrand: BrandLite | null;
  brands: BrandLite[];
}) {
  const pathname = usePathname();

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
    <aside className="w-[216px] shrink-0 bg-white border-r border-slate-line flex flex-col px-3.5 py-5 gap-1">
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
    </aside>
  );
}
