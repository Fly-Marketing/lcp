"use client";

import {
  AlertOctagon,
  Calendar,
  Home,
  Lock,
  MessageCircleQuestion,
  SprayCan,
  Wrench,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { IssueCategory } from "@/lib/types";

const CATEGORY_ICON: Record<IssueCategory, React.ComponentType<{ className?: string }>> = {
  "Supplies Needed": SprayCan,
  "Maintenance Issue": Wrench,
  "Damage / Property Concern": Home,
  "Access Problem": Lock,
  "Cleaning Concern": AlertOctagon,
  "Schedule Issue": Calendar,
  Other: MessageCircleQuestion,
};

export function IssueCategoryPicker({
  categories,
  selected,
  onSelect,
}: {
  categories: IssueCategory[];
  selected: IssueCategory | null;
  onSelect: (category: IssueCategory) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {categories.map((category) => {
        const Icon = CATEGORY_ICON[category];
        const isSelected = selected === category;
        return (
          <button
            key={category}
            type="button"
            onClick={() => onSelect(category)}
            className={cn(
              "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors",
              isSelected
                ? "border-primary bg-primary/5"
                : "border-border bg-card"
            )}
          >
            <Icon
              className={cn(
                "size-5",
                isSelected ? "text-primary" : "text-muted-foreground"
              )}
            />
            <span className="text-sm font-medium text-foreground">
              {category}
            </span>
          </button>
        );
      })}
    </div>
  );
}
