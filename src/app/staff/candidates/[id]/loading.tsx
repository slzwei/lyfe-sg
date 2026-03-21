export default function CandidateDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 animate-pulse rounded bg-stone-100" />
            <div className="h-7 w-40 animate-pulse rounded-lg bg-stone-200" />
            <div className="h-5 w-10 animate-pulse rounded bg-purple-100" />
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-3.5 w-36 animate-pulse rounded bg-stone-100" />
            <div className="h-3.5 w-24 animate-pulse rounded bg-stone-100" />
          </div>
        </div>
        <div className="h-8 w-16 animate-pulse rounded-lg bg-stone-100" />
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="h-3 w-14 animate-pulse rounded bg-stone-100" />
            <div className="mt-2 h-4 w-20 animate-pulse rounded bg-stone-200" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Activity timeline (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Add note */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="mb-3 h-4 w-20 animate-pulse rounded bg-stone-200" />
            <div className="flex gap-2">
              <div className="h-9 w-24 animate-pulse rounded-lg bg-stone-100" />
              <div className="h-9 flex-1 animate-pulse rounded-lg bg-stone-100" />
              <div className="h-9 w-14 animate-pulse rounded-lg bg-stone-200" />
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-2xl border border-stone-200 bg-white">
            <div className="border-b border-stone-100 px-5 py-3">
              <div className="h-4 w-24 animate-pulse rounded bg-stone-200" />
            </div>
            <div className="divide-y divide-stone-50">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-10 animate-pulse rounded bg-stone-100" />
                    <div className="h-3 w-20 animate-pulse rounded bg-stone-100" />
                    <div className="h-3 w-28 animate-pulse rounded bg-stone-100" />
                  </div>
                  <div className="mt-2 h-3.5 w-3/4 animate-pulse rounded bg-stone-100" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Documents sidebar (1/3) */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-white">
            <div className="border-b border-stone-100 px-5 py-3">
              <div className="h-4 w-24 animate-pulse rounded bg-stone-200" />
            </div>
            <div className="divide-y divide-stone-50">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="h-3.5 w-24 animate-pulse rounded bg-stone-200" />
                    <div className="mt-1.5 h-3 w-32 animate-pulse rounded bg-stone-100" />
                  </div>
                  <div className="h-4 w-4 animate-pulse rounded bg-stone-100" />
                </div>
              ))}
            </div>
          </div>

          {/* Notes card */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="mb-2 h-3 w-12 animate-pulse rounded bg-stone-100" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-full animate-pulse rounded bg-stone-100" />
              <div className="h-3.5 w-2/3 animate-pulse rounded bg-stone-100" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
