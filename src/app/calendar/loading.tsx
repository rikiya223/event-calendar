// ナビゲーション中に表示されるスケルトン（体感速度の向上）
export default function CalendarLoading() {
  return (
    <main className="px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-6xl animate-pulse space-y-6">
        <div className="flex justify-between gap-3">
          <div className="h-11 w-full max-w-md rounded-full bg-surface-container" />
          <div className="h-11 w-32 rounded-full bg-surface-container" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-20 rounded-full bg-surface-container" />
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="h-[420px] rounded-2xl border border-outline-variant/30 bg-surface-container-lowest" />
          <div className="h-[420px] rounded-2xl border border-outline-variant/30 bg-surface-container-lowest" />
        </div>
        <div className="h-52 rounded-2xl bg-surface-container" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest" />
          ))}
        </div>
      </div>
    </main>
  );
}
