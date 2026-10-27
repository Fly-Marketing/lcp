"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPhone } from "@/lib/auth/phone";
import {
  requestCodeAction,
  verifyCodeAction,
  type SignInState,
} from "@/app/pilot/signin/actions";

export function SignInForm({ returnTo, fakeMode }: { returnTo: string; fakeMode: boolean }) {
  const initial: SignInState = { step: "phone", phone: "", returnTo, error: null, notice: null };
  const [phoneState, requestAction, requesting] = useActionState(requestCodeAction, initial);
  const [codeState, verifyAction, verifying] = useActionState(verifyCodeAction, phoneState);

  // Once a code was requested, the verify form takes over and keeps its own error state.
  const onCodeStep = phoneState.step === "code";
  const state = onCodeStep ? (codeState.step === "code" || codeState.error ? codeState : phoneState) : phoneState;
  const phone = onCodeStep ? phoneState.phone : "";

  if (!onCodeStep) {
    return (
      <form action={requestAction} className="flex flex-col gap-4">
        <input type="hidden" name="returnTo" value={returnTo} />
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Mobile number</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(780) 555-0123"
            required
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            We&apos;ll text you a 6-digit code. You only need to do this once per device.
          </p>
        </div>
        {phoneState.error ? <p role="alert" className="text-sm text-destructive">{phoneState.error}</p> : null}
        <Button type="submit" size="lg" disabled={requesting}>
          {requesting ? <Loader2 className="size-4 animate-spin" /> : null}
          Text me a code
        </Button>
        {fakeMode ? (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
            FAKE DATA MODE — any number works; the code is 000000.
          </p>
        ) : null}
      </form>
    );
  }

  return (
    <form action={verifyAction} className="flex flex-col gap-4">
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="phone" value={phone} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="code">Enter your code</Label>
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          placeholder="123456"
          className="text-center text-lg tracking-[0.4em]"
          required
          autoFocus
        />
        <p className="text-xs text-muted-foreground">
          {phoneState.notice} Sent to {formatPhone(phone)}.
        </p>
      </div>
      {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" size="lg" disabled={verifying}>
        {verifying ? <Loader2 className="size-4 animate-spin" /> : null}
        Verify and continue
      </Button>
      <a href={`/pilot/signin?returnTo=${encodeURIComponent(returnTo)}`} className="text-center text-sm text-muted-foreground underline">
        Use a different number
      </a>
    </form>
  );
}
