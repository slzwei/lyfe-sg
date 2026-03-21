export default function InviteLoading() {
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Send Invitation Form */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 h-5 w-36 animate-pulse rounded bg-stone-200" />
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 h-3.5 w-12 animate-pulse rounded bg-stone-100" />
            <div className="h-11 w-full animate-pulse rounded-lg bg-stone-100 sm:h-10" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-1.5 h-3.5 w-28 animate-pulse rounded bg-stone-100" />
              <div className="h-11 w-full animate-pulse rounded-lg bg-stone-100 sm:h-10" />
            </div>
            <div>
              <div className="mb-1.5 h-3.5 w-16 animate-pulse rounded bg-stone-100" />
              <div className="h-11 w-full animate-pulse rounded-lg bg-stone-100 sm:h-10" />
            </div>
          </div>
          <div className="h-11 w-36 animate-pulse rounded-xl bg-stone-200 sm:h-10" />
        </div>
      </div>

      {/* Candidate List */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-5 w-28 animate-pulse rounded bg-stone-200" />
          <div className="flex items-center gap-2">
            <div className="h-3 w-12 animate-pulse rounded bg-stone-100" />
            <div className="h-6 w-6 animate-pulse rounded-lg bg-stone-100" />
          </div>
        </div>

        <div className="mb-3 h-3 w-28 animate-pulse rounded bg-stone-100" />

        {/* Desktop table skeleton */}
        <div className="hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 text-left text-xs font-medium uppercase tracking-wider text-stone-400">
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Email</th>
                <th className="pb-2 pr-4">Position</th>
                <th className="pb-2 pr-4">Progress</th>
                <th className="pb-2 pr-4">Sent</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="py-2.5 pr-4"><div className="h-4 w-24 animate-pulse rounded bg-stone-100" /></td>
                  <td className="py-2.5 pr-4"><div className="h-4 w-36 animate-pulse rounded bg-stone-100" /></td>
                  <td className="py-2.5 pr-4"><div className="h-4 w-28 animate-pulse rounded bg-stone-100" /></td>
                  <td className="py-2.5 pr-4">
                    <div className="w-28">
                      <div className="h-3 w-16 animate-pulse rounded bg-stone-100" />
                      <div className="mt-1 h-1.5 w-full animate-pulse rounded-full bg-stone-100" />
                    </div>
                  </td>
                  <td className="py-2.5 pr-4"><div className="h-4 w-16 animate-pulse rounded bg-stone-100" /></td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-1.5">
                      <div className="h-6 w-6 animate-pulse rounded bg-stone-100" />
                      <div className="h-6 w-6 animate-pulse rounded bg-stone-100" />
                      <div className="h-6 w-6 animate-pulse rounded bg-stone-100" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile card skeleton */}
        <div className="space-y-3 md:hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="h-4 w-28 animate-pulse rounded bg-stone-200" />
                  <div className="mt-1.5 h-3.5 w-40 animate-pulse rounded bg-stone-100" />
                </div>
                <div className="w-28">
                  <div className="h-3 w-16 animate-pulse rounded bg-stone-100" />
                  <div className="mt-1 h-1.5 w-full animate-pulse rounded-full bg-stone-100" />
                </div>
              </div>
              <div className="mt-2 h-3 w-36 animate-pulse rounded bg-stone-100" />
              <div className="mt-3 flex items-center gap-1 border-t border-stone-100 pt-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="h-8 w-8 animate-pulse rounded-lg bg-stone-100" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
