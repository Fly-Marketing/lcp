"use client";

import { useState, useTransition } from "react";
import { Loader2, Bell, CalendarRange, HelpCircle, Link2, LogOut } from "lucide-react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { requestNewCleanerLink } from "@/lib/pilot/actions";

// Notification/availability toggles are visual-only for now — staff.taking_new_work
// and staff.new_job_alerts exist in the schema but aren't wired to real persistence
// yet. This screen reflects that intentionally rather than faking a save.
export function AccountActions({ staffId }: { staffId: string }) {
  const [isPending, startTransition] = useTransition();
  const [smsEnabled, setSmsEnabled] = useState(true);

  function handleRequestLink() {
    startTransition(async () => {
      const result = await requestNewCleanerLink(staffId);
      if (!result.success) {
        toast.error(result.message ?? "Failed to generate a new link");
        return;
      }
      toast.success(
        result.url
          ? "New link generated — check with LCP to have it sent to you."
          : "New link generated (fake mode)."
      );
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <Bell className="size-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Notifications</p>
            <p className="text-xs text-muted-foreground">SMS (text message)</p>
          </div>
        </div>
        <Switch
          checked={smsEnabled}
          onCheckedChange={setSmsEnabled}
          aria-label="Toggle SMS notifications"
        />
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <CalendarRange className="size-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">My availability</p>
            <p className="text-xs text-muted-foreground">Set the days you&apos;re available</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" disabled>
          Edit
        </Button>
      </div>

      <button
        type="button"
        className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left"
      >
        <HelpCircle className="size-5 text-muted-foreground" />
        <div className="flex-1">
          <p className="text-sm font-medium">Help &amp; support</p>
          <p className="text-xs text-muted-foreground">Get help or contact the team</p>
        </div>
      </button>

      <button
        type="button"
        onClick={handleRequestLink}
        disabled={isPending}
        className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : (
          <Link2 className="size-5 text-muted-foreground" />
        )}
        <div className="flex-1">
          <p className="text-sm font-medium">Request a new secure link</p>
          <p className="text-xs text-muted-foreground">Generate a new magic link for secure access</p>
        </div>
      </button>

      <button
        type="button"
        className="flex items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm font-medium text-destructive"
      >
        <LogOut className="size-4" />
        Sign out
      </button>
    </div>
  );
}
