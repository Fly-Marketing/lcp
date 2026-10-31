"use client";

import { useState, useTransition } from "react";
import { ChevronRight, KeyRound, Loader2, LogOut, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CollapsibleCard } from "@/components/pilot/collapsible-card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  assignCleaner,
  assignManager,
  changeAccountPhone,
  createAccount,
  issueLoginCode,
  revokeAccountDevices,
  revokeOneDevice,
  setAccountActive,
  unassignCleaner,
  unassignManager,
  updateAccountName,
} from "@/app/pilot/admin/actions";
import { formatPhone } from "@/lib/auth/phone";
import { cn } from "@/lib/utils";
import type { AdminAccount, AdminData } from "@/lib/auth/admin";

const selectCls = "h-8 w-full rounded-lg border border-input bg-background px-2 text-sm";

function rolesOf(a: AdminAccount): string[] {
  const roles: string[] = [];
  if (a.isAdmin) roles.push("Admin");
  if (a.staffId) roles.push("Cleaner");
  if (a.customerId) roles.push("Owner");
  if (a.managerOf.length > 0) roles.push("Manager");
  return roles;
}

const last10 = (value: string) => value.replace(/\D/g, "").slice(-10);
const testBadge = (
  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">Test</span>
);

// People are dropdowns. Opening one shows the details and actions, then their properties.
// Adding and editing happen in place.
export function AccountAdmin({ data }: { data: AdminData }) {
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ accountId: string; code: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(fn: () => Promise<{ success: boolean; message?: string }>, ok: string) {
    startTransition(async () => {
      const r = await fn();
      if (!r.success) return void toast.error(r.message ?? "Something went wrong");
      toast.success(ok);
    });
  }

  function giveCode(account: AdminAccount) {
    startTransition(async () => {
      const r = await issueLoginCode(account.id);
      if (!r.success) return void toast.error(r.message);
      setIssued({ accountId: account.id, code: r.code });
    });
  }

  const selected = data.accounts.find((a) => a.id === selectedId) ?? null;

  const showDetail = adding || selected !== null;
  const stats = [
    { label: "People", value: data.accounts.length },
    { label: "Cleaners", value: data.accounts.filter((a) => a.staffId).length },
    { label: "Owners", value: data.accounts.filter((a) => a.customerId).length },
    { label: "Managers", value: data.accounts.filter((a) => a.managerOf.length > 0).length },
  ];


  // One person's card: the actions, About (with the devices), any sign-in code, and Properties.
  const renderPerson = (a: AdminAccount) => (
    <div className="flex flex-col gap-4 text-sm">
            <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={isPending || !a.active} onClick={() => giveCode(a)}>
            <KeyRound className="size-4" />
            Give login code
            </Button>
            <Button
            variant="outline"
            disabled={isPending || a.devices === 0}
            onClick={() => run(() => revokeAccountDevices(a.id), "Devices signed out")}
            >
            <LogOut className="size-4" />
            Sign out devices
            </Button>
            <Button
            variant="outline"
            disabled={isPending}
            onClick={() => run(() => setAccountActive(a.id, !a.active), a.active ? "Account deactivated" : "Account activated")}
            >
            <Power className="size-4" />
            {a.active ? "Deactivate" : "Activate"}
            </Button>
            </div>
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">About</h3>
                <Button variant="outline" size="sm" onClick={() => setEditingId(editingId === a.id ? null : a.id)}>
                  {editingId === a.id ? null : <Pencil className="size-4" />}
                  {editingId === a.id ? "Cancel" : "Edit"}
                </Button>
              </div>
              {editingId === a.id ? (
                <AccountForm data={data} account={a} onCancel={() => setEditingId(null)} onDone={() => setEditingId(null)} />
              ) : (
                <dl className="grid gap-4 text-sm sm:grid-cols-3">
                  <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mobile</dt>
                  <dd className="mt-1">{formatPhone(a.phone)}</dd>
                  </div>
                  <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</dt>
                  <dd className="mt-1">{a.active ? "Active" : "Inactive"}</dd>
                  </div>
                  <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Signed in on</dt>
                  <dd className="mt-1">
                  {a.devices} {a.devices === 1 ? "device" : "devices"}
                  </dd>
                  </div>
                  </dl>
              )}
              <DeviceList
                devices={a.deviceList}
                editing={editingId === a.id}
                busy={isPending}
                onRemove={(deviceId, label) => run(() => revokeOneDevice(a.id, deviceId), `${label} signed out`)}
              />
            </div>

            {issued?.accountId === a.id ? (
              <div role="status" className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-900">
                One-time login code:{" "}
                <span className="font-mono text-lg font-semibold tracking-widest">{issued.code}</span>
                <p className="text-xs">Valid for 10 minutes and works once. They enter it on the sign-in screen with their number.</p>
                <Button size="xs" variant="ghost" onClick={() => setIssued(null)}>Hide</Button>
              </div>
            ) : null}

            <PropertyAssignments account={a} data={data} />

          </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-xl font-semibold">People</h2>
          <p className="text-sm text-muted-foreground">Cleaners, managers and owners</p>
        </div>
        <Button
          onClick={() => {
            setSelectedId(null);
            setAdding(true);
          }}
          disabled={adding}
        >
          <Plus className="size-4" />
          Add person
        </Button>
      </div>
      <div className={cn("grid gap-6 md:items-start", showDetail && "md:grid-cols-[minmax(0,380px)_1fr]")}>
      <div className={cn("flex min-w-0 flex-col gap-4", showDetail && "md:max-h-[calc(100dvh-7rem)] md:overflow-y-auto")}>
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
          <dl className={cn("grid grid-cols-2 gap-3 text-sm", !showDetail && "sm:grid-cols-4")}>
            {stats.map((st) => (
              <div key={st.label} className="rounded-lg bg-background p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{st.label}</dt>
                <dd className="mt-1 text-xl font-semibold">{st.value}</dd>
              </div>
            ))}
          </dl>
        </div>

          <div className="flex flex-col gap-2">
            {data.accounts.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  setAdding(false);
                  setSelectedId(a.id);
                }}
                className={cn(
                  "flex items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors",
                  a.id === selectedId && !adding ? "border-primary ring-1 ring-primary" : "border-border hover:bg-muted/40",
                  !a.active && "opacity-60"
                )}
              >
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-semibold">
                    {a.name || formatPhone(a.phone)}
                    {a.isTest ? testBadge : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {rolesOf(a).join(" · ") || "No role yet"} · {formatPhone(a.phone)}
                  </p>
                </div>
                {!a.active ? (
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">Inactive</span>
                ) : null}
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
            {data.accounts.length === 0 ? <p className="text-sm text-muted-foreground">No people yet. Add the first one.</p> : null}
          </div>
      </div>

      {showDetail ? (
        <div className="flex min-w-0 flex-col gap-4">
          <div className="w-full">
          {adding ? (
            <AccountForm
              data={data}
              onCancel={() => setAdding(false)}
              onDone={(id) => {
                setAdding(false);
                if (id) setSelectedId(id);
              }}
            />
          ) : selected ? (
            <div className="flex flex-col gap-4">
              <h2 className="font-heading text-xl font-semibold">{selected.name || formatPhone(selected.phone)}</h2>
              {renderPerson(selected)}
            </div>
          ) : undefined}
          </div>
        </div>
      ) : null}
      </div>
    </div>
  );
}

type AccountDraft = Parameters<typeof createAccount>[0];

// Add: a cleaner, owner or manager with the records that role needs. Edit: name and mobile number.
function AccountForm({
  data,
  account,
  onCancel,
  onDone,
}: {
  data: AdminData;
  account?: AdminAccount;
  onCancel: () => void;
  onDone: (createdId?: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [role, setRole] = useState<"cleaner" | "owner" | "manager">("cleaner");
  const [name, setName] = useState(account?.name ?? "");
  const [phone, setPhone] = useState(account ? formatPhone(account.phone) : "");
  const [buildingId, setBuildingId] = useState("");
  const [cleanerRole, setCleanerRole] = useState<"primary" | "backup">("primary");
  const [customerId, setCustomerId] = useState("");
  const [canEditPrice, setCanEditPrice] = useState(false);
  const [isPrimary, setIsPrimary] = useState(false);
  const [isTest, setIsTest] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    !isPending && name.trim() !== "" && phone.trim() !== "" && (account || role !== "manager" || buildingId !== "");

  function fail(message: string) {
    setError(message);
    toast.error(message);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      if (account) {
        if (name.trim() !== account.name) {
          const r = await updateAccountName(account.id, name);
          if (!r.success) return fail(r.message);
        }
        if (last10(phone) !== last10(account.phone)) {
          const r = await changeAccountPhone(account.id, phone);
          if (!r.success) return fail(r.message);
        }
        toast.success("Account saved");
        onDone();
        return;
      }

      const draft: AccountDraft =
        role === "cleaner"
          ? { role, name, phone, buildingId: buildingId || null, cleanerRole, isTest }
          : role === "owner"
            ? { role, name, phone, customerId: customerId || null, isTest }
            : { role, name, phone, buildingId, canEditPrice, isPrimary, isTest };
      const r = await createAccount(draft);
      if (!r.success) return fail(r.message);
      toast.success("Account created");
      onDone(r.id);
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      {!account ? (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={isTest} onChange={(e) => setIsTest(e.target.checked)} />
          <span>
            Test person
            <span className="block text-xs text-muted-foreground">
              Signs in on the preview with a code from this screen. Nothing is texted.
            </span>
          </span>
        </label>
      ) : null}

      {!account ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="account-role">Role</Label>
          <select id="account-role" className={selectCls} value={role} onChange={(e) => setRole(e.target.value as "cleaner" | "owner" | "manager")}>
            <option value="cleaner">Cleaner</option>
            <option value="owner">Owner</option>
            <option value="manager">Manager</option>
          </select>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="account-name">Name</Label>
          <Input id="account-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="account-phone">Mobile number</Label>
          <Input id="account-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>

      {!account && role === "cleaner" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-building">Assign to property (optional)</Label>
            <select id="account-building" className={selectCls} value={buildingId} onChange={(e) => setBuildingId(e.target.value)}>
              <option value="">Not assigned yet</option>
              {data.buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-cleaner-role">Cleaner type</Label>
            <select id="account-cleaner-role" className={selectCls} value={cleanerRole} onChange={(e) => setCleanerRole(e.target.value as "primary" | "backup")}>
              <option value="primary">Primary</option>
              <option value="backup">Backup</option>
            </select>
          </div>
        </div>
      ) : null}

      {!account && role === "owner" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="account-owner">Owner</Label>
          <select id="account-owner" className={selectCls} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">New owner, named as above</option>
            {data.customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <p className="text-xs text-muted-foreground">Assign their properties from Properties.</p>
        </div>
      ) : null}

      {!account && role === "manager" ? (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-manager-building">Property</Label>
            <select id="account-manager-building" className={selectCls} value={buildingId} onChange={(e) => setBuildingId(e.target.value)}>
              <option value="">Choose a property</option>
              {data.buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={canEditPrice} onChange={(e) => setCanEditPrice(e.target.checked)} />
            Can edit job prices
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
            Primary manager for this property
          </label>
        </>
      ) : null}

      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" disabled={isPending} onClick={onCancel}>Cancel</Button>
        <Button disabled={!canSubmit} onClick={submit}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {account ? "Save person" : "Create person"}
        </Button>
      </div>
    </div>
  );
}

// Properties a person owns, cleans at and manages. Cleaning and managing can be added and removed here.
function PropertyAssignments({ account, data }: { account: AdminAccount; data: AdminData }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [buildingId, setBuildingId] = useState("");
  const [canEditPrice, setCanEditPrice] = useState(false);
  const [isPrimary, setIsPrimary] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const owned = data.buildings.filter((b) => account.customerId !== null && b.customerId === account.customerId);
  const linkable = data.buildings.filter(
    (b) =>
      !account.cleansAt.some((c) => c.buildingId === b.id) &&
      !account.managerOf.some((m) => m.buildingId === b.id)
  );

  function run(fn: () => Promise<{ success: boolean; message?: string }>, ok: string) {
    startTransition(async () => {
      const r = await fn();
      if (!r.success) return void toast.error(r.message ?? "Something went wrong");
      toast.success(ok);
      setBuildingId("");
      setAddOpen(false);
    });
  }

  type Tag = { label: string; tone: "role" | "detail" };
  const rows: { key: string; name: string; tags: Tag[]; remove: null | (() => void) }[] = [
    ...owned.map((b) => ({ key: `own-${b.id}`, name: b.name, tags: [{ label: "Owner", tone: "role" as const }], remove: null })),
    ...account.cleansAt.map((c) => ({
      key: `clean-${c.buildingId}`,
      name: c.buildingName,
      tags: [
        { label: "Cleaner", tone: "role" as const },
        { label: c.role === "backup" ? "Backup" : "Primary", tone: "detail" as const },
      ],
      remove: account.staffId ? () => run(() => unassignCleaner(account.staffId!, c.buildingId), "Removed from property") : null,
    })),
    ...account.managerOf.map((m) => ({
      key: `mgr-${m.buildingId}`,
      name: m.buildingName,
      tags: [
        { label: "Manager", tone: "role" as const },
        ...(m.isPrimary ? [{ label: "Primary", tone: "detail" as const }] : []),
        ...(m.canEditPrice ? [{ label: "Can edit prices", tone: "detail" as const }] : []),
      ],
      remove: () => run(() => unassignManager(account.id, m.buildingId), "No longer managing this property"),
    })),
  ];


  const count = account.cleansAt.length + account.managerOf.length;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold">Properties</h3>
        <p className="text-xs text-muted-foreground">What this person owns, cleans and manages</p>
      </div>
      <dl className="grid grid-cols-3 gap-3 text-sm">
        {[
          { label: "Owns", value: owned.length },
          { label: "Cleans at", value: account.cleansAt.length },
          { label: "Manages", value: account.managerOf.length },
        ].map((st) => (
          <div key={st.label} className="rounded-lg bg-background p-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{st.label}</dt>
            <dd className="mt-1 text-xl font-semibold">{st.value}</dd>
          </div>
        ))}
      </dl>
      <CollapsibleCard
        id={`assignments-${account.id}`}
        open={open}
        onToggle={() => setOpen((o) => !o)}
        title={<span className="font-medium">Assigned properties</span>}
        badge={<span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{count}</span>}
      >
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4">
      <div className="flex flex-col">
        {rows.length === 0 ? <p className="py-2 text-muted-foreground">Not assigned to any property.</p> : null}
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-3 border-b border-border py-2 last:border-b-0">
            <span className="flex-1 text-sm">{r.name}</span>
            <div className="flex flex-wrap justify-end gap-1">
              {r.tags.map((t) => (
                <span
                  key={t.label}
                  className={
                    t.tone === "role"
                      ? "rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary"
                      : "rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                  }
                >
                  {t.label}
                </span>
              ))}
            </div>
            {r.remove ? (
              <Button size="xs" variant="ghost" disabled={isPending} onClick={r.remove}>
                Remove
              </Button>
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Add to a property
        </Button>
      </div>
        </div>
      </CollapsibleCard>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {account.name || formatPhone(account.phone)} to a property</DialogTitle>
            <DialogDescription>Choose a property and how they work there.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <select className={selectCls} aria-label="Property" value={buildingId} onChange={(e) => setBuildingId(e.target.value)}>
              <option value="">Choose a property</option>
              {linkable.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={canEditPrice} onChange={(e) => setCanEditPrice(e.target.checked)} />
              Can edit job prices (manager)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
              Primary manager (manager)
            </label>
            <div className="flex flex-wrap justify-end gap-2">
              {account.staffId ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending || !buildingId}
                  onClick={() => run(() => assignCleaner(account.staffId!, buildingId, "primary"), "Assigned as cleaner")}
                >
                  Assign as cleaner
                </Button>
              ) : null}
              <Button
                size="sm"
                disabled={isPending || !buildingId}
                onClick={() => run(() => assignManager(account.id, buildingId, canEditPrice, isPrimary), "Assigned as manager")}
              >
                Assign as manager
              </Button>
            </div>
            {!account.staffId ? (
              <p className="text-xs text-muted-foreground">Cleaning needs a cleaner record. Create the person as a cleaner to assign them.</p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Signed-in devices, as a dropdown inside the About card. Remove shows only in Edit mode.
function DeviceList({
  devices,
  editing,
  busy,
  onRemove,
}: {
  devices: AdminAccount["deviceList"];
  editing: boolean;
  busy: boolean;
  onRemove: (deviceId: string, label: string) => void;
}) {
  const [manualOpen, setManualOpen] = useState(false);
  // Editing opens the device list; otherwise it opens and closes on the user's click.
  const open = editing || manualOpen;
  return (
    <CollapsibleCard
      id={`devices-${devices.map((d) => d.id).join("-") || "none"}`}
      open={open}
      onToggle={() => setManualOpen((o) => !o)}
      title={<span className="font-medium">Signed-in devices</span>}
      badge={<span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{devices.length}</span>}
    >
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4">
        {devices.length === 0 ? <p className="text-muted-foreground">No devices are signed in.</p> : null}
        {devices.map((d) => (
          <div key={d.id} className="flex items-center gap-3">
            <p className="flex-1 text-sm">{d.label}</p>
            <p className="text-xs text-muted-foreground">Last used {d.lastSeen}</p>
            {editing ? (
              <Button variant="ghost" size="sm" aria-label={`Remove ${d.label}`} disabled={busy} onClick={() => onRemove(d.id, d.label)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    </CollapsibleCard>
  );
}
