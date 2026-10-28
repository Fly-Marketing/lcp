// Shown instantly while a pilot page's data loads, so a click never leaves the screen blank.
export default function PilotLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl animate-pulse space-y-4 p-4" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-40 rounded bg-muted" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}
