import AnimateIn from "./AnimateIn";

const services = [
  {
    title: "Life Insurance",
    description:
      "Protect your loved ones with coverage that ensures their financial security, no matter what life brings.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    title: "Health Insurance",
    description:
      "Stay covered with comprehensive health plans that give you peace of mind when medical needs arise.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    ),
  },
  {
    title: "Savings Plans",
    description:
      "Build your nest egg steadily with disciplined savings plans designed for your financial goals.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
  },
  {
    title: "Investments",
    description:
      "Grow your wealth with investment-linked plans suited to your risk appetite and timeline.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
  },
  {
    title: "Retirement Planning",
    description:
      "Plan for the retirement you deserve with strategies that ensure comfort in your golden years.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
      </svg>
    ),
  },
  {
    title: "Critical Illness",
    description:
      "Get financial protection when you need it most with coverage against major critical illnesses.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1m0 0L3.44 12.96a.75.75 0 000 1.06l2.88 2.88a.75.75 0 001.06 0l7.56-7.56a.75.75 0 000-1.06l-2.88-2.88a.75.75 0 00-1.06 0L8.88 7.72m2.54 7.45L20.56 6.1" />
      </svg>
    ),
  },
];

export default function Services() {
  return (
    <section id="services" className="relative py-28 sm:py-36 bg-stone-50">
      {/* Top edge */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent" />

      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <AnimateIn className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500 mb-4">
            What We Do
          </p>
          <h2 className="text-3xl sm:text-[2.5rem] font-extrabold tracking-tight text-stone-900 leading-tight">
            Comprehensive financial solutions
          </h2>
          <p className="mt-4 text-base sm:text-lg text-stone-500">
            From protection to wealth building, we help you navigate every
            aspect of your financial journey.
          </p>
        </AnimateIn>

        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, i) => (
            <AnimateIn key={service.title} delay={0.05 * i}>
              <div className="group relative rounded-2xl bg-white p-7 border border-stone-100 hover:border-orange-200 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/5 h-full">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-500 group-hover:bg-orange-500 group-hover:text-white group-hover:scale-110 transition-all duration-300">
                  {service.icon}
                </div>
                <h3 className="mt-5 text-base font-bold text-stone-900">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm text-stone-500 leading-relaxed">
                  {service.description}
                </p>
                {/* Hover accent line */}
                <div className="absolute bottom-0 left-6 right-6 h-0.5 rounded-full bg-orange-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              </div>
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  );
}
