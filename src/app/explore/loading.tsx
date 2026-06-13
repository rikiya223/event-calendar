export default function ExploreLoading() {
  return (
    <main className="px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-5xl animate-pulse space-y-8">
        <div className="space-y-3">
          <div className="h-7 w-48 rounded bg-surface-container" />
          <div className="h-14 w-full rounded-full bg-surface-container" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest" />
          ))}
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest" />
          ))}
        </div>
      </div>
    </main>
  );
}
