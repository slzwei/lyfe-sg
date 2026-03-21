export default function OnboardingLoading() {
  return (
    <div>
      <div className="mb-6">
        <div className="h-7 w-48 animate-pulse rounded-lg bg-stone-200" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-stone-100" />
      </div>

      {/* Step indicator skeleton */}
      <div className="mb-6 flex items-center gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-1.5 flex-1 animate-pulse rounded-full bg-stone-200" />
        ))}
      </div>

      {/* Form card skeleton */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <div className="h-5 w-32 animate-pulse rounded bg-stone-200" />
        <div className="mt-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div className="mb-1.5 h-3 w-24 animate-pulse rounded bg-stone-100" />
              <div className="h-11 w-full animate-pulse rounded-lg bg-stone-100" />
            </div>
          ))}
        </div>
        <div className="mt-6 h-10 w-28 animate-pulse rounded-xl bg-stone-200" />
      </div>
    </div>
  );
}
