export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-64 animate-pulse rounded-3xl bg-stone-200/50" />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="h-80 animate-pulse rounded-3xl bg-stone-200/50 lg:col-span-3" />
        <div className="h-56 animate-pulse rounded-3xl bg-stone-200/50 lg:col-span-2" />
      </div>
      <div className="h-40 animate-pulse rounded-3xl bg-stone-200/50" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-48 animate-pulse rounded-2xl bg-stone-200/50" />
        <div className="h-48 animate-pulse rounded-2xl bg-stone-200/50" />
      </div>
    </div>
  );
}
