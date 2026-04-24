export function CardSkeleton() {
  return (
    <section className="overflow-hidden rounded-3xl border border-white/5 bg-ink-900/60 p-1.5 shadow-bezel">
      <div className="rounded-[1.35rem] border border-white/5 bg-ink-800/40 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-3 w-24 animate-shimmer rounded shimmer" />
            <div className="h-5 w-56 animate-shimmer rounded shimmer" />
          </div>
          <div className="h-6 w-20 animate-shimmer rounded-full shimmer" />
        </div>
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-shimmer rounded-xl shimmer" />
          ))}
        </div>
      </div>
    </section>
  );
}

export function SkeletonGrid() {
  return (
    <div className="flex flex-col gap-5">
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}
