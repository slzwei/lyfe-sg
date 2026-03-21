export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-7 w-36 animate-pulse rounded-lg bg-stone-200" />

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="h-3 w-20 animate-pulse rounded bg-stone-100" />
            <div className="mt-3 h-8 w-12 animate-pulse rounded-lg bg-stone-200" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* DISC distribution */}
        <div className="rounded-2xl border border-stone-200 bg-white">
          <div className="border-b border-stone-100 px-5 py-4">
            <div className="h-4 w-32 animate-pulse rounded bg-stone-200" />
          </div>
          <div className="flex flex-wrap gap-2 p-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 w-14 animate-pulse rounded-xl bg-stone-100" />
            ))}
          </div>
        </div>

        {/* Recent candidates */}
        <div className="rounded-2xl border border-stone-200 bg-white">
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
            <div className="h-4 w-36 animate-pulse rounded bg-stone-200" />
            <div className="h-3 w-14 animate-pulse rounded bg-stone-100" />
          </div>
          <div className="divide-y divide-stone-50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="h-3.5 w-28 animate-pulse rounded bg-stone-200" />
                  <div className="mt-1.5 h-3 w-36 animate-pulse rounded bg-stone-100" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-16 animate-pulse rounded-full bg-stone-100" />
                  <div className="h-3 w-14 animate-pulse rounded bg-stone-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
