"use client";

import { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, KeyRound, Loader2, LogOut, Pencil, Plus, Power } from "lucide-react";
import { toast } from "sonner";

import { MasterDetail } from "@/components/pilot/master-detail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changeAccountPhone,
  createAccount,
  issueLoginCode,
  revokeAccountDevices,
  setAccountActive,
  updateAccountName,
} from "@/app/pilot/admin/actions";
import { formatPhone } from "@/lib/auth/phone";
import type { AdminAccount, AdminData } from "@/lib/auth/admin";
import { cn } from "@/lib/utils";

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

// Accounts follow the same pattern as the Properties page: a list of cards and a full card for the
// selected person. Adding and editing happen inside that panel, with no extra side sheet.
export function AccountAdmin({ data }: { data: AdminData }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<"create" | "edit" | null>(null);
  const [isPending, startTransition] = useTransition();
  const [issued, setIssued] = useState<{ accountId: string; code: string } | null>(null);

  const selected = data.accounts.find((a) => a.id === selectedId) ?? null;
  const ownedBy = (a: AdminAccount) => data.buildings.filter((b) => a.customerId && b.customerId === a.customerId);

  function select(id: string | null) {
    setSelectedId(id);
    setForm(null);
  }

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

  const list = (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-xl font-semibold">Accounts</h2>
          <p className="text-sm text-muted-foreground">Cleaners, managers and owners</p>
        </div>
        <Button
          onClick={() => {
            select(null);
            setForm("create");
          }}
        >
          <Plus className="size-4" />
          Add account
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {data.accounts.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => select(a.id)}
            className={cn(
              "flex items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors",
              a.id === selectedId && form !== "create" ? "border-primary ring-1 ring-primary" : "border-border hover:bg-muted/40",
              !a.active && "opacity-60"
            )}
          >
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-semibold">
                {a.name || formatPhone(a.phone)}
                {a.isTest ? <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">Test</span> : null}
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
        {data.accounts.length === 0 ? <p className="text-sm text-muted-foreground">No accounts yet. Add the first one.</p> : null}
      </div>
    </div>
  );

  let detail: React.ReactNode = null;
  if (form === "create") {
    detail = (
      <AccountForm
        key="new"
        data={data}
        onCancel={() => setForm(null)}
        onDone={(id) => {
          setForm(null);
          if (id) setSelectedId(id);
        }}
      />
    );
  } else if (selected) {
    detail = (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => select(null)}
          className="flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground md:hidden"
        >
          <ChevronLeft className="size-4" />
          All accounts
        </button>

        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-heading text-xl font-semibold">{selected.name || formatPhone(selected.phone)}</h2>
            <p className="text-sm text-muted-foreground">{rolesOf(selected).join(" · ") || "No role yet"}</p>
          </div>
          {form !== "edit" ? (
            <Button variant="outline" size="sm" onClick={() => setForm("edit")}>
              <Pencil className="size-4" />
              Edit
            </Button>
          ) : null}
        </div>

        {issued?.accountId === selected.id ? (
          <div role="status" className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-900">
            One-time login code:{" "}
            <span className="font-mono text-lg font-semibold tracking-widest">{issued.code}</span>
            <p className="text-xs">Valid for 10 minutes and works once. They enter it on the sign-in screen with their number.</p>
            <Button size="xs" variant="ghost" onClick={() => setIssued(null)}>Hide</Button>
          </div>
        ) : null}

        {form === "edit" ? (
          <AccountForm key={selected.id} inline data={data} account={selected} onCancel={() => setForm(null)} onDone={() => setForm(null)} />
        ) : (
        <dl className="grid gap-4 rounded-xl border border-border bg-card p-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mobile</dt>
            <dd className="mt-1">{formatPhone(selected.phone)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</dt>
            <dd className="mt-1">{selected.active ? "Active" : "Inactive"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Signed in on</dt>
            <dd className="mt-1">{selected.devices} {selected.devices === 1 ? "device" : "devices"}</dd>
          </div>
        </dl>
        )}

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 text-sm">
          <h3 className="text-sm font-semibold">Properties</h3>
          {ownedBy(selected).length === 0 && selected.cleansAt.length === 0 && selected.managerOf.length === 0 ? (
            <p className="text-muted-foreground">Not linked to any property yet.</p>
          ) : null}
          {ownedBy(selected).map((b) => (
            <p key={`own-${b.id}`}><span className="text-muted-foreground">Owns </span>{b.name}</p>
          ))}
          {selected.cleansAt.map((c) => (
            <p key={`clean-${c.buildingId}`}>
              <span className="text-muted-foreground">Cleans at </span>
              {c.buildingName} <span className="text-xs text-muted-foreground">· {c.role}</span>
            </p>
          ))}
          {selected.managerOf.map((m) => (
            <p key={`mgr-${m.buildingId}`}>
              <span className="text-muted-foreground">Manages </span>
              {m.buildingName}
              <span className="text-xs text-muted-foreground">
                {m.isPrimary ? " · primary" : ""}
                {m.canEditPrice ? " · can edit prices" : ""}
              </span>
            </p>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={isPending || !selected.active} onClick={() => giveCode(selected)}>
            <KeyRound className="size-4" />
            Give login code
          </Button>
          <Button
            variant="outline"
            disabled={isPending || selected.devices === 0}
            onClick={() => run(() => revokeAccountDevices(selected.id), "Devices signed out")}
          >
            <LogOut className="size-4" />
            Sign out devices
          </Button>
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => run(() => setAccountActive(selected.id, !selected.active), selected.active ? "Account deactivated" : "Account activated")}
          >
            <Power className="size-4" />
            {selected.active ? "Deactivate" : "Activate"}
          </Button>
        </div>
      </div>
    );
  }

  return <MasterDetail list={list} detail={detail} />;
}

type AccountDraft = Parameters<typeof createAccount>[0];

// Add: a cleaner, owner or manager with the records that role needs. Edit: name and mobile number.
// Shown in the detail panel in place of the account card.
function AccountForm({
  data,
  account,
  inline = false,
  onCancel,
  onDone,
}: {
  data: AdminData;
  account?: AdminAccount;
  // inline: replaces the details block in place (edit). Otherwise it fills the panel (add).
  inline?: boolean;
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

  const fields = (
    <>
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
    </>
  );

  const buttons = (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" disabled={isPending} onClick={onCancel}>Cancel</Button>
      <Button disabled={!canSubmit} onClick={submit}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {account ? "Save account" : "Create account"}
      </Button>
    </div>
  );

  if (inline) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        {fields}
        {buttons}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onCancel}
        className="flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground md:hidden"
      >
        <ChevronLeft className="size-4" />
        Back
      </button>

      <div>
        <h2 className="font-heading text-xl font-semibold">Add account</h2>
        <p className="text-sm text-muted-foreground">Create a cleaner, owner or manager. They sign in with a texted code.</p>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">{fields}</div>
      {buttons}
    </div>
  );
}
