import Image from "next/image";
import { redirect } from "next/navigation";

import { SignInForm } from "@/app/pilot/signin/signin-form";
import { getSession } from "@/lib/auth/session";
import { safeReturnTo } from "@/lib/auth/return-to";
import { usesFakeData } from "@/lib/pilot/mode";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo: rawReturnTo } = await searchParams;
  const returnTo = safeReturnTo(rawReturnTo);

  // Already on a trusted device? Go straight in.
  if (await getSession()) redirect(returnTo);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 p-6">
      <div className="flex items-center gap-2">
        <Image src="/lcp-logo.svg" alt="LCP" width={32} height={32} />
        <span className="font-heading text-lg font-semibold">LCP</span>
      </div>
      <div>
        <h1 className="font-heading text-2xl font-semibold">Sign in</h1>
        <p className="text-sm text-muted-foreground">Use the mobile number LCP has on file for you.</p>
      </div>
      <SignInForm returnTo={returnTo} fakeMode={usesFakeData()} />
    </main>
  );
}
