"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Building2, ClipboardList, LogOut, Settings, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/app/pilot/signin/actions";
import type { NavItem, NavKey } from "@/lib/auth/nav";

const ICONS: Record<NavKey, LucideIcon> = {
  properties: Building2,
  jobs: ClipboardList,
  management: Users,
};

// Settings pill in the top bar. The name is kept for screen readers only.
function AccountPill({ displayName }: { displayName: string }) {
  return (
    <Link
      href="/pilot/account"
      aria-label={`Account settings for ${displayName}`}
      className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Settings className="size-4" />
      My settings
    </Link>
  );
}

export function PilotShell({
  items,
  displayName,
  children,
}: {
  items: NavItem[];
  displayName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="min-h-dvh bg-muted/30 md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col gap-6 border-r border-border bg-background p-4 md:flex">
        <div className="flex items-center gap-2 px-2">
          <Image src="/lcp-logo.svg" alt="LCP" width={28} height={28} />
          <span className="font-heading text-sm font-semibold">LCP</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {items.map((item) => {
            const Icon = ICONS[item.key];
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </form>
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <Image src="/lcp-logo.svg" alt="LCP" width={24} height={24} />
            <span className="font-heading text-sm font-semibold">LCP</span>
          </div>
          <AccountPill displayName={displayName} />
        </header>

        {/* Desktop top bar: account lives here, not in the nav */}
        <header className="hidden items-center justify-end border-b border-border bg-background px-6 py-3 md:flex">
          <AccountPill displayName={displayName} />
        </header>

        <main className="mx-auto w-full max-w-md flex-1 p-4 pb-20 md:max-w-5xl md:p-6 md:pb-6">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 flex border-t border-border bg-background md:hidden">
          {items.map((item) => {
            const Icon = ICONS[item.key];
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
