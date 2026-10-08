"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export interface CompletionItem {
  id: string;
  title: string;
  description?: string;
  checked: boolean;
}

export function CompletionChecklist({
  items,
  onToggle,
}: {
  items: CompletionItem[];
  onToggle: (id: string, checked: boolean) => void;
}) {
  const completedCount = items.filter((item) => item.checked).length;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold text-foreground">
          Completion
        </h3>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {completedCount} / {items.length}
        </span>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="group flex items-start gap-3 rounded-lg border border-border bg-background p-3"
          >
            <Checkbox
              id={item.id}
              checked={item.checked}
              onCheckedChange={(checked) => onToggle(item.id, checked === true)}
              className="mt-0.5"
            />
            <Label htmlFor={item.id} className="flex-1 cursor-pointer font-normal">
              <span className="block font-medium text-foreground">
                {item.title}
              </span>
              {item.description ? (
                <span className="mt-0.5 block text-sm text-muted-foreground">
                  {item.description}
                </span>
              ) : null}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
