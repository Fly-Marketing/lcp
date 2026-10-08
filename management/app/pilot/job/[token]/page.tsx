import { notFound } from "next/navigation";
import { Calendar, MapPin, Clock } from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { getLinkedJob } from "@/lib/pilot/fake-data";

export const dynamic = "force-dynamic";

export default async function PilotJobPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const linked = getLinkedJob(token);

  if (!linked) {
    notFound();
  }

  const { staffName, job } = linked;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4">
      <div>
        <p className="text-sm text-muted-foreground">Hi {staffName},</p>
        <h1 className="font-heading text-xl font-medium">Your next turnover</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{job.unitLabel}</CardTitle>
          <CardDescription>{job.propertyName}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>{job.address}</span>
          </div>
          <div className="flex items-start gap-2">
            <Calendar className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              Checkout {job.checkoutDate} at {job.checkoutTime}
              {job.nextCheckInDate ? ` · Next guest ${job.nextCheckInDate}` : ""}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>Approx. {job.expectedHours} hrs</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
