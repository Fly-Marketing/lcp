"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, Briefcase, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function PilotShell({
  token,
  staffName,
  children,
}: {
  token: string;
  staffName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { href: `/pilot/job/${token}`, label: "Today", icon: Home },
    { href: `/pilot/history/${token}`, label: "My Jobs", icon: Briefcase },
    { href: `/pilot/account/${token}`, label: "Account", icon: User },
  ];

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
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
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
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <Image src="/lcp-logo.svg" alt="LCP" width={24} height={24} />
            <span className="font-heading text-sm font-semibold">LCP</span>
          </div>
          <span className="text-sm text-muted-foreground">Hi, {staffName}</span>
        </header>

        {/* Desktop top bar */}
        <header className="hidden items-center justify-end border-b border-border bg-background px-6 py-3 md:flex">
          <span className="text-sm text-muted-foreground">Hi, {staffName}</span>
        </header>

        <main className="mx-auto w-full max-w-md flex-1 p-4 pb-20 md:max-w-5xl md:p-6 md:pb-6">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 flex border-t border-border bg-background md:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
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
