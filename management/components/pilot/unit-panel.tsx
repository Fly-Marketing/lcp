"use client";

import { useState, useTransition } from "react";
import { ChevronLeft, KeyRound, Loader2, Plus, Sparkles, StickyNote, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveUnitDetails } from "@/lib/pilot/actions";
import { DEFAULT_CHECKLIST_ITEMS, type ChecklistItem } from "@/lib/pilot/types";

export interface UnitView {
  id: string;
  name: string;
  buildingName: string;
  address: string | null;
  accessInstructions: string | null;
  importantNotes: string | null;
  specialRequirements: string | null;
  checklistItems: ChecklistItem[] | null;
}

function slug(title: string, taken: Set<string>): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 30) || "item";
  let id = base;
  let n = 2;
  while (taken.has(id)) id = `${base}_${n++}`;
  return id;
}

export function UnitPanel({
  unit,
  canEdit,
  onBack,
}: {
  unit: UnitView;
  canEdit: boolean;
  onBack?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [access, setAccess] = useState(unit.accessInstructions ?? "");
  const [notes, setNotes] = useState(unit.importantNotes ?? "");
  const [requirements, setRequirements] = useState(unit.specialRequirements ?? "");
  const [items, setItems] = useState<ChecklistItem[]>(unit.checklistItems ?? DEFAULT_CHECKLIST_ITEMS);
  const [useDefault, setUseDefault] = useState(!unit.checklistItems);

  function save() {
    startTransition(async () => {
      const result = await saveUnitDetails(unit.id, {
        accessInstructions: access,
        importantNotes: notes,
        specialRequirements: requirements,
        checklistItems: useDefault ? null : items,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Unit details saved");
      setEditing(false);
    });
  }

  function addItem() {
    const taken = new Set(items.map((i) => i.id));
    setUseDefault(false);
    setItems([...items, { id: slug("New item", taken), title: "New item" }]);
  }

  const shown = unit.checklistItems ?? DEFAULT_CHECKLIST_ITEMS;

  return (
    <div className="flex flex-col gap-4">
      {onBack ? (
        <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground md:hidden">
          <ChevronLeft className="size-4" />
          Back to properties
        </button>
      ) : null}

      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-2xl font-medium">{unit.name}</h2>
          <p className="text-muted-foreground">{unit.buildingName}</p>
          {unit.address ? <p className="text-xs text-muted-foreground">{unit.address}</p> : null}
        </div>
        {canEdit && !editing ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit details
          </Button>
        ) : null}
      </div>

      {editing ? (
        <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <Field label="Access instructions" value={access} onChange={setAccess} />
          <Field label="Important notes" value={notes} onChange={setNotes} />
          <Field label="Special requirements" value={requirements} onChange={setRequirements} />

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Cleaner checklist</Label>
              {!useDefault ? (
                <Button type="button" size="xs" variant="ghost" onClick={() => setUseDefault(true)}>
                  Use the default checklist
                </Button>
              ) : null}
            </div>
            {useDefault ? (
              <p className="text-xs text-muted-foreground">
                Using the standard checklist. Add an item to customise it for this unit.
              </p>
            ) : null}
            {(useDefault ? DEFAULT_CHECKLIST_ITEMS : items).map((item, index) => (
              <div key={item.id} className="flex items-center gap-2">
                <Input
                  value={item.title}
                  maxLength={80}
                  disabled={useDefault}
                  onChange={(e) =>
                    setItems(items.map((it, i) => (i === index ? { ...it, title: e.target.value } : it)))
                  }
                  aria-label={`Checklist item ${index + 1}`}
                />
                {!useDefault ? (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="destructive"
                    aria-label="Remove item"
                    onClick={() => setItems(items.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                ) : null}
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                if (useDefault) setItems(DEFAULT_CHECKLIST_ITEMS);
                addItem();
              }}
            >
              <Plus className="size-3.5" />
              Add checklist item
            </Button>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={isPending} onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button disabled={isPending || (!useDefault && items.length === 0)} onClick={save}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Info icon={KeyRound} label="Access instructions" value={unit.accessInstructions} />
          <Info icon={StickyNote} label="Important notes" value={unit.importantNotes} />
          <Info icon={Sparkles} label="Special requirements" value={unit.specialRequirements} />
          <div className="rounded-xl border border-border bg-card p-4 text-sm">
            <p className="mb-2 font-medium">Cleaner checklist{unit.checklistItems ? "" : " (standard)"}</p>
            <ul className="list-inside list-disc text-muted-foreground">
              {shown.map((i) => (
                <li key={i.id}>{i.title}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} maxLength={1000} />
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-muted/50 p-4 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p>{value || <span className="text-muted-foreground">Not set</span>}</p>
      </div>
    </div>
  );
}
