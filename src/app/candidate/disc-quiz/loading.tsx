export default function DiscQuizLoading() {
  return (
    <div>
      <div className="mb-6">
        <div className="h-7 w-56 animate-pulse rounded-lg bg-stone-200" />
        <div className="mt-2 h-4 w-80 animate-pulse rounded bg-stone-100" />
      </div>

      {/* Progress bar skeleton */}
      <div className="mb-6">
        <div className="mb-2 flex justify-between">
          <div className="h-3 w-20 animate-pulse rounded bg-stone-100" />
          <div className="h-3 w-12 animate-pulse rounded bg-stone-100" />
        </div>
        <div className="h-2 w-full animate-pulse rounded-full bg-stone-200" />
      </div>

      {/* Question card skeleton */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <div className="h-5 w-3/4 animate-pulse rounded bg-stone-200" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 w-full animate-pulse rounded-xl bg-stone-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
