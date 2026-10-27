import { redirect } from "next/navigation";

// Legacy token links. The token is intentionally ignored (and never logged): everyone now
// signs in with an SMS code on a trusted device.
export default function LegacyLinkPage() {
  redirect("/pilot/signin");
}
