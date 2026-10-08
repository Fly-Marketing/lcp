import { Badge } from "@/components/ui/badge";

const CLEAN_STATUS_CLASS = {
  true: "bg-purple-500 text-white",
  false: "bg-orange-500 text-white",
  unknown: "bg-blue-500 text-white",
} as const;

export function CleanStatusBadge({ isClean }: { isClean?: boolean }) {
  if (isClean === undefined) {
    return (
      <Badge variant="secondary" className={CLEAN_STATUS_CLASS.unknown}>
        Unknown
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className={CLEAN_STATUS_CLASS[isClean ? "true" : "false"]}
    >
      {isClean ? "Clean" : "Not Clean"}
    </Badge>
  );
}
