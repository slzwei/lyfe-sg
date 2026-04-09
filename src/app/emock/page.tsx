import Link from "next/link";

const MODULES = [
  {
    code: "M9",
    title: "Life Insurance & Investment-Linked Policies",
    description:
      "Unit trusts, ILPs, insurance planning, taxation, and regulatory framework for existing representatives.",
    quizCount: 4,
    questionCount: 400,
    href: "/emock/m9",
    available: true,
  },
  {
    code: "RES5",
    title: "Rules & Regulations for Financial Advisory Services",
    description:
      "Financial advisory regulations, licensing requirements, and compliance guidelines.",
    href: "/emock/res5",
    available: false,
  },
  {
    code: "M8",
    title: "Life Insurance & ILPs (New Representatives)",
    description:
      "Fundamentals of life insurance products and investment-linked policies for new entrants.",
    href: "/emock/m8",
    available: false,
  },
  {
    code: "HI",
    title: "Health Insurance",
    description:
      "Health insurance products, MediShield Life, Integrated Shield Plans, and claims management.",
    href: "/emock/hi",
    available: false,
  },
];

export default function EmockPage() {
  const activeCount = MODULES.filter((m) => m.available).length;
  const totalQuizzes = MODULES.reduce(
    (sum, m) => sum + (m.quizCount ?? 0),
    0
  );
  const totalQuestions = MODULES.reduce(
    (sum, m) => sum + (m.questionCount ?? 0),
    0
  );

  return (
    <>
      {/* Hero */}
      <div className="-mx-4 -mt-8 mb-10">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-6 pt-10 pb-8 sm:px-8 sm:pt-12 sm:pb-10">
          <p className="text-orange-200 text-sm font-medium tracking-wide uppercase mb-2">
            Lyfe Exam Prep
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3">
            eMock
          </h1>
          <p className="text-orange-100 text-base sm:text-lg max-w-md leading-relaxed mb-8">
            Timed practice papers for CMFAS certification. Pick a module and
            start drilling.
          </p>

          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white text-sm font-medium px-3.5 py-1.5 rounded-full">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
                />
              </svg>
              {totalQuizzes} quizzes
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white text-sm font-medium px-3.5 py-1.5 rounded-full">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
                />
              </svg>
              {totalQuestions} questions
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white text-sm font-medium px-3.5 py-1.5 rounded-full">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
              120 min each
            </span>
          </div>
        </div>
      </div>

      {/* Section heading */}
      <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-4">
        {activeCount} module{activeCount !== 1 ? "s" : ""} available
      </h2>

      {/* Module cards */}
      <div className="space-y-3">
        {MODULES.map((mod) =>
          mod.available ? (
            <Link
              key={mod.code}
              href={mod.href}
              className="block bg-white rounded-xl border-l-4 border-l-orange-500 border border-stone-200 p-5 hover:shadow-md hover:border-stone-300 transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="shrink-0 text-xs font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                      {mod.code}
                    </span>
                    <h3 className="font-semibold text-stone-900 group-hover:text-orange-600 transition-colors truncate">
                      {mod.title}
                    </h3>
                  </div>
                  <p className="text-sm text-stone-500 leading-relaxed mb-3">
                    {mod.description}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-stone-400">
                    <span>{mod.quizCount} quizzes</span>
                    <span className="w-1 h-1 rounded-full bg-stone-300" />
                    <span>{mod.questionCount} questions</span>
                    <span className="w-1 h-1 rounded-full bg-stone-300" />
                    <span>70% to pass</span>
                  </div>
                </div>
                <span className="shrink-0 mt-1 text-stone-300 group-hover:text-orange-500 transition-colors">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m8.25 4.5 7.5 7.5-7.5 7.5"
                    />
                  </svg>
                </span>
              </div>
            </Link>
          ) : (
            <div
              key={mod.code}
              className="bg-white/60 rounded-xl border border-stone-200/60 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="shrink-0 text-xs font-bold bg-stone-100 text-stone-400 px-2 py-0.5 rounded">
                      {mod.code}
                    </span>
                    <h3 className="font-semibold text-stone-400 truncate">
                      {mod.title}
                    </h3>
                  </div>
                  <p className="text-sm text-stone-400/80 leading-relaxed">
                    {mod.description}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-stone-400 bg-stone-100 px-2.5 py-1 rounded-full mt-0.5">
                  Soon
                </span>
              </div>
            </div>
          )
        )}
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-stone-400 mt-10">
        More modules are being prepared. Check back for updates.
      </p>
    </>
  );
}
