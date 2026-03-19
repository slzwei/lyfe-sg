import AnimateIn from "./AnimateIn";

const highlights = [
  {
    title: "Trusted",
    subtitle: "Backed by Income Insurance",
    description:
      "Formerly NTUC Income \u2014 one of Singapore\u2019s most established insurers with decades of service.",
    accent: "bg-orange-500",
  },
  {
    title: "Personal",
    subtitle: "Tailored advice",
    description:
      "We take time to understand your unique situation and goals before recommending any solution.",
    accent: "bg-orange-400",
  },
  {
    title: "Dedicated",
    subtitle: "Long-term partnership",
    description:
      "We\u2019re not here for a one-time sale. We build lasting relationships through every life stage.",
    accent: "bg-orange-300",
  },
];

export default function About() {
  return (
    <section id="about" className="py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          {/* Left — text */}
          <div>
            <AnimateIn>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500 mb-4">
                Who We Are
              </p>
            </AnimateIn>
            <AnimateIn delay={0.1}>
              <h2 className="text-3xl sm:text-[2.5rem] font-extrabold tracking-tight text-stone-900 leading-tight">
                Financial guidance
                <br />
                you can count on
              </h2>
            </AnimateIn>
            <AnimateIn delay={0.2}>
              <p className="mt-5 text-base sm:text-lg text-stone-500 leading-relaxed max-w-lg">
                Lyfe is a group of financial representatives under Income
                Insurance (formerly NTUC Income). We believe everyone deserves
                access to clear, honest financial advice &mdash; no jargon, no
                pressure, just genuine care for your well-being.
              </p>
            </AnimateIn>
          </div>

          {/* Right — cards with accent bar */}
          <div className="space-y-5">
            {highlights.map((item, i) => (
              <AnimateIn key={item.title} delay={0.1 + i * 0.1}>
                <div className="flex rounded-2xl bg-stone-50 overflow-hidden hover:shadow-md transition-shadow">
                  <div className={`w-1.5 shrink-0 ${item.accent}`} />
                  <div className="p-6 sm:p-7">
                    <p className="text-lg font-bold text-stone-900">
                      {item.title}
                      <span className="text-stone-400 font-normal"> &mdash; </span>
                      <span className="text-stone-600 font-semibold">{item.subtitle}</span>
                    </p>
                    <p className="mt-2 text-sm text-stone-500 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
