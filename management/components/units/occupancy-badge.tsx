import { Badge } from "@/components/ui/badge";
import { daysUntil } from "@/lib/deadline-groups";

export function OccupancyBadge({ checkoutDate }: { checkoutDate?: string }) {
  if (!checkoutDate) return null;

  const daysToCheckout = daysUntil(checkoutDate);
  const isOccupied = daysToCheckout > 0;

  if (!isOccupied) return null;

  return (
    <Badge variant="secondary" className="bg-purple-500 text-white">
      Occupied
    </Badge>
  );
}
