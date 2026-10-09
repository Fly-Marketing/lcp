export function MasterDetail({
  list,
  detail,
}: {
  list: React.ReactNode;
  detail?: React.ReactNode;
}) {
  if (!detail) {
    // No job selected: full-width list on every breakpoint.
    return <div className="mx-auto w-full max-w-md md:max-w-2xl">{list}</div>;
  }

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,380px)_1fr] md:items-start">
      {/* On mobile, only the detail shows (the list route is a separate page). On
          desktop, both columns render side by side. */}
      <div className="hidden md:block md:max-h-[calc(100dvh-7rem)] md:overflow-y-auto">{list}</div>
      <div className="w-full max-w-md md:max-w-none md:rounded-2xl md:border md:border-border md:bg-background md:p-6">
        {detail}
      </div>
    </div>
  );
}
