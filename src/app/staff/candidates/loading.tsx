export default function CandidatesLoading() {
  return (
    <div>
      <div className="mb-6 h-7 w-36 animate-pulse rounded-lg bg-stone-200" />

      <div className="space-y-4">
        {/* Search + invite button */}
        <div className="flex gap-3">
          <div className="h-10 flex-1 animate-pulse rounded-xl bg-stone-100" />
          <div className="h-10 w-36 animate-pulse rounded-xl bg-stone-200" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-stone-200">
          <div className="h-8 w-28 animate-pulse rounded-t bg-stone-100" />
          <div className="h-8 w-20 animate-pulse rounded-t bg-stone-100" />
          <div className="h-8 w-24 animate-pulse rounded-t bg-stone-100" />
        </div>

        {/* Table skeleton */}
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 text-left text-xs font-medium text-stone-400">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><div className="h-4 w-28 animate-pulse rounded bg-stone-100" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-40 animate-pulse rounded bg-stone-100" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-32 animate-pulse rounded bg-stone-100" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-stone-100" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-16 animate-pulse rounded bg-stone-100" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-12 animate-pulse rounded bg-stone-100" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
