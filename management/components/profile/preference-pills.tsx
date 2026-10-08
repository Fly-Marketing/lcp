"use client";

import { cn } from "@/lib/utils";

export function PreferencePills({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onToggle(option)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              isSelected
                ? "border-primary bg-primary/5 text-primary"
                : "border-border bg-card text-foreground"
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
