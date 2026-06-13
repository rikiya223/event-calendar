export default function EventLoading() {
  return (
    <main className="mx-auto w-full max-w-2xl animate-pulse pb-40 md:pb-28">
      <div className="h-44 bg-surface-container" />
      <div className="space-y-6 px-5 pt-6">
        <div className="h-6 w-24 rounded bg-surface-container" />
        <div className="h-20 rounded-xl border border-outline-variant/30 bg-surface-container-lowest" />
        <div className="h-6 w-24 rounded bg-surface-container" />
        <div className="h-56 rounded-xl border border-outline-variant/30 bg-surface-container-lowest" />
      </div>
    </main>
  );
}
