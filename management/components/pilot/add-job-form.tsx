"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { createCleaningJob } from "@/lib/pilot/actions";

export interface AddJobUnit {
  id: string;
  name: string;
  buildingName: string;
  standardRate: number | null;
}

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `k-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function AddJobSheet({
  units,
  open,
  onOpenChange,
  initialUnitId,
  defaultDate,
  today,
}: {
  units: AddJobUnit[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialUnitId?: string;
  defaultDate?: string;
  today: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [unitId, setUnitId] = useState(initialUnitId ?? units[0]?.id ?? "");
  const [date, setDate] = useState(defaultDate ?? today);
  const [time, setTime] = useState("");
  const [special, setSpecial] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  // One key per form session: tapping Schedule twice can only ever create one job.
  const keyRef = useRef(newKey());

  const unit = units.find((u) => u.id === unitId);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createCleaningJob({
        unitId,
        date,
        time: time || null,
        specialRequest: special ? notes : null,
        idempotencyKey: keyRef.current,
      });
      if (!result.success) {
        setError(result.message);
        toast.error(result.message);
        return;
      }
      toast.success("Clean scheduled");
      keyRef.current = newKey();
      setSpecial(false);
      setNotes("");
      setTime("");
      onOpenChange(false);
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add cleaning job</SheetTitle>
          <SheetDescription>Schedule an additional clean. It&apos;s sent to your cleaner right away.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-1.5">
            <Label>Property</Label>
            <Select value={unitId} onValueChange={setUnitId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a unit" />
              </SelectTrigger>
              <SelectContent>
                {units.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} · {u.buildingName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="job-date">Cleaning date</Label>
              <Input id="job-date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="job-time">Preferred start</Label>
              <Input id="job-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
            <p className="font-medium">Regular cleaning</p>
            <p className="text-xs text-muted-foreground">
              Standard cleaning rate applies
              {unit?.standardRate != null ? ` · $${unit.standardRate.toFixed(2)}` : ""}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Checkbox id="special" checked={special} onCheckedChange={(c) => setSpecial(c === true)} />
              <Label htmlFor="special" className="cursor-pointer">Special request</Label>
            </div>
            {special ? (
              <>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add instructions for this clean"
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  The cleaning manager will be notified. Scheduling is not delayed.
                </p>
              </>
            ) : null}
          </div>

          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        </div>

        <SheetFooter>
          <Button size="lg" disabled={isPending || !unitId || !date} onClick={submit}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Schedule clean
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
