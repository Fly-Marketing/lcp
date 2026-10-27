"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2, UserCog, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addCleaner, assignManager, removeCleaner, removeManager } from "@/lib/pilot/actions";

export interface TeamView {
  buildingId: string;
  buildingName: string;
  managedBy: "lcp" | "self";
  canEdit: boolean;
  cleaners: { staffId: string; name: string; role: "primary" | "backup" }[];
  managers: { accountId: string; name: string; canEditPrice: boolean; isPrimary: boolean }[];
}

export function TeamPanel({ groups }: { groups: TeamView[] }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Team</h1>
        <p className="text-sm text-muted-foreground">Who cleans and manages your properties</p>
      </div>
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No properties are linked to your account yet.</p>
      ) : null}
      {groups.map((g) => (
        <BuildingTeam key={g.buildingId} group={g} />
      ))}
    </div>
  );
}

function BuildingTeam({ group }: { group: TeamView }) {
  const [isPending, startTransition] = useTransition();
  const [cName, setCName] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [mName, setMName] = useState("");
  const [mPhone, setMPhone] = useState("");
  const [mPrice, setMPrice] = useState(false);
  const [mPrimary, setMPrimary] = useState(false);

  function run(fn: () => Promise<{ success: boolean; message?: string }>, ok: string, reset?: () => void) {
    startTransition(async () => {
      const r = await fn();
      if (!r.success) return void toast.error(r.message ?? "Something went wrong");
      toast.success(ok);
      reset?.();
    });
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
      <div>
        <h2 className="font-heading text-lg font-semibold">{group.buildingName}</h2>
        {!group.canEdit ? (
          <p className="text-xs text-muted-foreground">
            {group.managedBy === "lcp"
              ? "LCP manages staffing for this property. Contact LCP to change your team."
              : "You can view this team."}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Users className="size-4" /> Cleaners
        </h3>
        {group.cleaners.length === 0 ? <p className="text-sm text-muted-foreground">No cleaners assigned yet.</p> : null}
        {group.cleaners.map((c) => (
          <div key={c.staffId} className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2 text-sm">
            <span className="flex-1 font-medium">{c.name}</span>
            <span className="text-xs text-muted-foreground">{c.role === "primary" ? "Primary" : "Backup"}</span>
            {group.canEdit ? (
              <Button
                size="icon-sm"
                variant="destructive"
                aria-label={`Remove ${c.name}`}
                disabled={isPending}
                onClick={() => {
                  if (window.confirm(`Remove ${c.name} from ${group.buildingName}?`)) {
                    run(() => removeCleaner(group.buildingId, c.staffId), "Cleaner removed");
                  }
                }}
              >
                <Trash2 className="size-3.5" />
              </Button>
            ) : null}
          </div>
        ))}
        {group.canEdit ? (
          <div className="grid gap-2 rounded-lg border border-dashed border-border p-3 sm:grid-cols-[1fr_1fr_auto]">
            <Input placeholder="Name" value={cName} onChange={(e) => setCName(e.target.value)} aria-label="Cleaner name" />
            <Input placeholder="Mobile number" type="tel" value={cPhone} onChange={(e) => setCPhone(e.target.value)} aria-label="Cleaner mobile number" />
            <Button
              disabled={isPending || !cName || !cPhone}
              onClick={() =>
                run(() => addCleaner(group.buildingId, { name: cName, phone: cPhone }), "Cleaner added", () => {
                  setCName("");
                  setCPhone("");
                })
              }
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Add
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <UserCog className="size-4" /> Managers
        </h3>
        {group.managers.length === 0 ? <p className="text-sm text-muted-foreground">No managers assigned.</p> : null}
        {group.managers.map((m) => (
          <div key={m.accountId} className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2 text-sm">
            <span className="flex-1 font-medium">{m.name}</span>
            <span className="text-xs text-muted-foreground">
              {m.isPrimary ? "Primary contact" : "Manager"}
              {m.canEditPrice ? " · pricing" : ""}
            </span>
            {group.canEdit ? (
              <Button
                size="icon-sm"
                variant="destructive"
                aria-label={`Remove ${m.name}`}
                disabled={isPending}
                onClick={() => {
                  if (window.confirm(`Remove ${m.name} as a manager?`)) {
                    run(() => removeManager(group.buildingId, m.accountId), "Manager removed");
                  }
                }}
              >
                <Trash2 className="size-3.5" />
              </Button>
            ) : null}
          </div>
        ))}
        {group.canEdit ? (
          <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="Name" value={mName} onChange={(e) => setMName(e.target.value)} aria-label="Manager name" />
              <Input placeholder="Mobile number" type="tel" value={mPhone} onChange={(e) => setMPhone(e.target.value)} aria-label="Manager mobile number" />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox id={`price-${group.buildingId}`} checked={mPrice} onCheckedChange={(c) => setMPrice(c === true)} />
                <Label htmlFor={`price-${group.buildingId}`} className="cursor-pointer text-xs">Can edit job prices</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id={`primary-${group.buildingId}`} checked={mPrimary} onCheckedChange={(c) => setMPrimary(c === true)} />
                <Label htmlFor={`primary-${group.buildingId}`} className="cursor-pointer text-xs">Primary contact for alerts</Label>
              </div>
              <Button
                className="ml-auto"
                disabled={isPending || !mName || !mPhone}
                onClick={() =>
                  run(
                    () => assignManager(group.buildingId, { name: mName, phone: mPhone, canEditPrice: mPrice, isPrimary: mPrimary }),
                    "Manager saved",
                    () => {
                      setMName("");
                      setMPhone("");
                      setMPrice(false);
                      setMPrimary(false);
                    }
                  )
                }
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Add manager
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
