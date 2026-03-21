export default function JobsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-7 w-36 animate-pulse rounded-lg bg-stone-200" />
        <div className="h-10 w-32 animate-pulse rounded-xl bg-stone-200" />
      </div>

      {/* Job card skeletons */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-40 animate-pulse rounded bg-stone-200" />
                  <div className="h-5 w-14 animate-pulse rounded-full bg-stone-100" />
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-4 w-16 animate-pulse rounded bg-stone-100" />
                  <div className="h-3.5 w-20 animate-pulse rounded bg-stone-100" />
                  <div className="h-3.5 w-24 animate-pulse rounded bg-stone-100" />
                </div>
                <div className="mt-3 space-y-1.5">
                  <div className="h-3.5 w-full animate-pulse rounded bg-stone-100" />
                  <div className="h-3.5 w-3/4 animate-pulse rounded bg-stone-100" />
                </div>
              </div>
              <div className="ml-4 flex items-center gap-1">
                <div className="h-7 w-14 animate-pulse rounded-lg bg-stone-100" />
                <div className="h-7 w-10 animate-pulse rounded-lg bg-stone-100" />
                <div className="h-7 w-14 animate-pulse rounded-lg bg-stone-100" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
