import { Progress } from "@/components/ui/progress";

export function RouteProgress({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return <Progress value={percent} className="h-2" />;
}
