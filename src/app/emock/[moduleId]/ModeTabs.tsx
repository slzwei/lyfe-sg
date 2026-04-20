import Link from "next/link";

export default function ModeTabs({
  moduleId,
  active,
}: {
  moduleId: string;
  active: "exam" | "tutorial";
}) {
  const base =
    "flex-1 text-center py-2.5 text-sm font-medium rounded-lg transition-colors";
  const activeCls = "bg-white text-orange-600 shadow-sm";
  const inactiveCls = "text-stone-500 hover:text-stone-700";

  return (
    <div className="inline-flex w-full max-w-xs bg-stone-100 p-1 rounded-xl mb-6">
      <Link
        href={`/emock/${moduleId}`}
        className={`${base} ${active === "exam" ? activeCls : inactiveCls}`}
        aria-current={active === "exam" ? "page" : undefined}
      >
        Exam
      </Link>
      <Link
        href={`/emock/${moduleId}/tutorial`}
        className={`${base} ${active === "tutorial" ? activeCls : inactiveCls}`}
        aria-current={active === "tutorial" ? "page" : undefined}
      >
        Tutorial
      </Link>
    </div>
  );
}
