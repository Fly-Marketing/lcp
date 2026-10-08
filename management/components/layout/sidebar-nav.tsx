"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, ClipboardList, Flag, Home, LogOut, User } from "lucide-react";

import { cn } from "@/lib/utils";
import { logout } from "@/lib/airtable/actions";
import { useMockStore } from "@/lib/mock-store";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/work", label: "Work", icon: ClipboardList },
  { href: "/units", label: "Units", icon: Building2 },
  { href: "/report", label: "Report", icon: Flag },
  { href: "/profile", label: "Profile", icon: User },
] as const;

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { employee } = useMockStore();

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-background md:flex">
      <div className="px-6 pt-6 pb-4">
        <p className="text-lg font-semibold tracking-tight text-foreground">
          LCP
        </p>
        <p className="text-xs text-muted-foreground">Employee Operations</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-muted text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="size-4.5" strokeWidth={isActive ? 2.5 : 2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-between gap-2 border-t border-border px-6 py-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {employee.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {employee.email}
          </p>
        </div>
        <button
          type="button"
          onClick={async () => {
            await logout();
            router.push("/login");
          }}
          aria-label="Log out"
          title="Log out"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </aside>
  );
}
