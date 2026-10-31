"use client";

import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

// The one dropdown style for the app. The caller passes what sits in the header (icon, title,
// tags, badge) and what goes in the body. The open state is controlled by the caller, so a list
// can make opening one section close the others.
export function CollapsibleCard({
  id,
  open,
  onToggle,
  icon,
  title,
  badge,
  highlight = true,
  children,
}: {
  id: string;
  open: boolean;
  onToggle: () => void;
  icon?: React.ReactNode;
  title: React.ReactNode;
  badge?: React.ReactNode;
  // highlight (default on): a pink border while open.
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={onToggle}
        className={cn(
          "flex w-full flex-wrap items-center gap-2 rounded-xl border bg-card px-4 py-3 text-left text-sm transition-colors",
          open && highlight ? "border-pink-500" : "border-border hover:bg-muted/40"
        )}
      >
        {icon}
        {title}
        {badge ? <span className="ml-auto">{badge}</span> : null}
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            badge ? "" : "ml-auto",
            open && "rotate-180",
            open && highlight && "text-pink-600"
          )}
        />
      </button>
      {open ? (
        <div id={id} className="flex flex-col gap-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}
