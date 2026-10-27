"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CompletionChecklist, type CompletionItem } from "@/components/pilot/completion-checklist";
import { completeJob } from "@/lib/pilot/actions";
import type { ChecklistItem } from "@/lib/pilot/types";

export function CompletionFlow({
  token,
  jobId,
  checklistItems,
}: {
  token: string;
  jobId: string;
  checklistItems: ChecklistItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState<CompletionItem[]>(
    checklistItems.map((item) => ({ ...item, checked: false }))
  );

  const allChecked = items.length > 0 && items.every((item) => item.checked);

  function handleToggle(id: string, checked: boolean) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, checked } : item)));
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await completeJob(jobId);
      if (!result.success) {
        toast.error(result.message ?? "Failed to mark complete");
        return;
      }
      toast.success("Job marked complete");
      router.push(`/pilot/history/${token}/view/${jobId}`);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <CompletionChecklist items={items} onToggle={handleToggle} />
      <Button disabled={!allChecked || isPending} onClick={handleSubmit}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {allChecked ? "Mark complete" : "Check off everything to finish"}
      </Button>
    </div>
  );
}
