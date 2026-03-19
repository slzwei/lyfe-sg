export default function Footer() {
  return (
    <footer className="bg-stone-900 border-t border-stone-800">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10 py-14">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <span
              className="font-display text-2xl text-orange-500"
              style={{ letterSpacing: "1px" }}
            >
              Lyfe
            </span>
            <span className="h-4 w-px bg-stone-700" />
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
              Financial Representatives
            </span>
          </div>
          <p className="text-sm text-stone-500 text-center">
            Representatives of Income Insurance Co-operative Ltd.
          </p>
          <p className="text-sm text-stone-600">
            &copy; {new Date().getFullYear()} Lyfe
          </p>
        </div>
      </div>
    </footer>
  );
}
