"use client";

import { useActionState, useState, useTransition } from "react";
import { Loader2, LogOut, Monitor, Phone, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  phoneChangeAction,
  signOutDevice,
  signOutOtherDevices,
  signOutThisDevice,
  type PhoneChangeState,
} from "@/lib/auth/account-actions";
import { formatPhone } from "@/lib/auth/phone";

export interface DeviceView {
  id: string;
  label: string;
  lastSeen: string;
  current: boolean;
}

export function AccountPanel({ phone, devices }: { phone: string; devices: DeviceView[] }) {
  const [isPending, startTransition] = useTransition();

  function run(fn: () => Promise<{ success: boolean }>, ok: string) {
    startTransition(async () => {
      const r = await fn();
      if (r.success) toast.success(ok);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="size-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">Trusted devices</p>
            <p className="text-xs text-muted-foreground">
              You only get a text code on a new device. Sign out any you don&apos;t recognise.
            </p>
          </div>
        </div>
        <ul className="flex flex-col gap-2">
          {devices.map((d) => (
            <li key={d.id} className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2 text-sm">
              <Monitor className="size-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 overflow-hidden">
                <p className="truncate font-medium">
                  {d.label}
                  {d.current ? <span className="ml-2 text-xs font-normal text-primary">This device</span> : null}
                </p>
                <p className="text-xs text-muted-foreground">Last used {d.lastSeen}</p>
              </div>
              {!d.current ? (
                <Button
                  size="xs"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => run(() => signOutDevice(d.id), "Device signed out")}
                >
                  Sign out
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        {devices.length > 1 ? (
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => run(signOutOtherDevices, "Other devices signed out")}
          >
            Sign out all other devices
          </Button>
        ) : null}
      </section>

      <PhoneChange phone={phone} />

      <form action={signOutThisDevice}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm font-medium text-destructive"
        >
          <LogOut className="size-4" />
          Sign out of this device
        </button>
      </form>
    </div>
  );
}

function PhoneChange({ phone }: { phone: string }) {
  const [open, setOpen] = useState(false);
  const initial: PhoneChangeState = { step: "start", newPhone: "", error: null };
  const [state, action, pending] = useActionState(phoneChangeAction, initial);

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <Phone className="size-5 text-muted-foreground" />
        <div className="flex-1">
          <p className="text-sm font-medium">Mobile number</p>
          <p className="text-xs text-muted-foreground">{formatPhone(phone)}</p>
        </div>
        {!open ? (
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
            Change
          </Button>
        ) : null}
      </div>

      {open ? (
        state.step === "done" ? (
          <p className="text-sm text-green-700">
            Your number is updated. Other devices were signed out for safety.
          </p>
        ) : state.step === "start" ? (
          <form action={action} className="flex flex-col gap-2">
            <Label htmlFor="newPhone">New mobile number</Label>
            <Input id="newPhone" name="newPhone" type="tel" inputMode="tel" placeholder="(780) 555-0123" required />
            <p className="text-xs text-muted-foreground">
              We&apos;ll text a code to your current number first, then to the new one.
            </p>
            {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Send code to current number
            </Button>
          </form>
        ) : (
          <form action={action} className="flex flex-col gap-2">
            <Label htmlFor="code">
              {state.step === "current"
                ? `Code sent to your current number (${formatPhone(phone)})`
                : `Code sent to ${formatPhone(state.newPhone)}`}
            </Label>
            <Input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              className="text-center tracking-[0.4em]"
              required
            />
            {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {state.step === "current" ? "Confirm and text new number" : "Confirm new number"}
            </Button>
          </form>
        )
      ) : null}
    </section>
  );
}
