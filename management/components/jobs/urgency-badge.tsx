import { Badge } from "@/components/ui/badge";
import type { UrgencyTag } from "@/lib/deadline-groups";

const SEVERITY_CLASS: Record<UrgencyTag["severity"], string> = {
  occupied: "bg-purple-500 text-white",
  critical: "bg-orange-500 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-blue-500 text-white",
  low: "bg-green-600 text-white",
};

export function UrgencyBadge({ tag }: { tag: UrgencyTag }) {
  return (
    <Badge variant="secondary" className={SEVERITY_CLASS[tag.severity]}>
      {tag.label}
    </Badge>
  );
}
