export default function EnneagramQuizLoading() {
  return (
    <div>
      <div className="mb-6">
        <div className="h-7 w-64 animate-pulse rounded-lg bg-stone-200" />
        <div className="mt-2 h-4 w-80 animate-pulse rounded bg-stone-100" />
      </div>

      <div className="mb-6">
        <div className="mb-2 flex justify-between">
          <div className="h-3 w-20 animate-pulse rounded bg-stone-100" />
          <div className="h-3 w-16 animate-pulse rounded bg-stone-100" />
        </div>
        <div className="h-2 w-full animate-pulse rounded-full bg-stone-200" />
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <div className="h-4 w-1/2 animate-pulse rounded bg-stone-200" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-20 w-full animate-pulse rounded-xl bg-stone-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
