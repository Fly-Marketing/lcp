import { Home } from "lucide-react";

// No real unit photos exist yet (units has no photo_url column). This is a
// generated placeholder, not a stand-in for a specific missing asset —
// swap for a real <img> once unit photos are a real feature.
export function PropertyPhoto({ className }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-primary/20 via-primary/10 to-muted ${className ?? ""}`}
    >
      <Home className="size-8 text-primary/40" />
    </div>
  );
}
