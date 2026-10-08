import { Badge } from "@/components/ui/badge";
import type { RoomState } from "@/lib/types";

const STATE_CLASS: Record<RoomState, string> = {
  Occupied: "bg-muted text-muted-foreground",
  Dirty: "bg-destructive/10 text-destructive",
  Clean: "bg-primary/10 text-primary",
  Cleaning: "bg-secondary text-secondary-foreground",
  Unknown: "bg-muted text-muted-foreground",
};

export function RoomStateBadge({ state }: { state: RoomState }) {
  return (
    <Badge className={STATE_CLASS[state]} variant="secondary">
      {state}
    </Badge>
  );
}
