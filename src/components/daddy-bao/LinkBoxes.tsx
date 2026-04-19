"use client";

import ImageSlider from "./ImageSlider";

interface LinkBox {
  id: string;
  title: string;
  images: string[];
  buttons: { label: string; href: string; external?: boolean }[];
  text: React.ReactNode;
}

const BOXES: LinkBox[] = [
  {
    id: "culture",
    title: "Our Culture",
    images: [
      "/lyfe-logo-orange-bg.png",
    ],
    buttons: [{ label: "LEARN MORE", href: "#culture" }],
    text: (
      <p>
        Help families achieve financial security. The work you do genuinely
        changes lives. We believe in mentorship, continuous learning, and
        building careers that last.
      </p>
    ),
  },
  {
    id: "apply",
    title: "Apply Now",
    images: [
      "/lyfe-logo-square.png",
    ],
    buttons: [{ label: "START APPLICATION", href: "/candidate/login" }],
    text: (
      <p>
        Ready to start your journey? Our application process is simple &mdash;
        complete a short profile, take a personality assessment, and meet the
        team. Whether you&apos;re experienced or exploring a career switch,
        there&apos;s a place for you at Lyfe.
      </p>
    ),
  },
  {
    id: "services",
    title: "Our Services",
    images: [
      "/lyfe-logo-orange-bg.png",
    ],
    buttons: [
      { label: "Life Protection", href: "#services" },
      { label: "Savings", href: "#services" },
      { label: "Retirement", href: "#services" },
    ],
    text: (
      <p>
        Comprehensive financial solutions tailored to every stage of life.
        From life protection and savings plans to retirement and critical
        illness coverage &mdash; we help Singaporeans plan with confidence.
      </p>
    ),
  },
  {
    id: "story",
    title: "Our Story",
    images: [
      "/lyfe-logo-square.png",
    ],
    buttons: [{ label: "READ MORE", href: "#story" }],
    text: (
      <p>
        Lyfe is a group of financial representatives. We believe everyone
        deserves access to clear, honest financial advice &mdash; no jargon,
        no pressure, just guidance you can trust.
      </p>
    ),
  },
];

export default function LinkBoxes() {
  return (
    <div id="link-boxes" className="flex flex-wrap relative max-lg:block" style={{ fontFamily: "var(--font-pt-mono), monospace" }}>
      {/* Center vertical divider */}
      <div className="absolute left-1/2 top-0 w-px h-full bg-white/20 -translate-x-1/2 max-lg:hidden z-[1]" />

      {BOXES.map((box) => (
        <div key={box.id} id={box.id} className="flex-[0_1_50%] max-lg:flex-auto flex flex-col">
          {/* Image slider */}
          <div className="relative pb-[60%]">
            <ImageSlider images={box.images} />
          </div>

          {/* Title bar */}
          <div className="flex justify-between border-t border-b border-white/20 pl-[25px] text-[18px] max-4xl:text-[17px] max-3xl:text-[16px] max-xl:text-[14px] max-lg:text-[18px] max-md:text-[17px] max-sm:text-[14px] max-xs:text-[12px]">
            <h2 className="font-bold text-[1em] uppercase m-0 py-[0.7em] max-3xl:py-[0.5em] max-xl:py-[0.7em] max-md:py-[0.6em] max-xs:py-[0.9em]">
              {box.title}
            </h2>
            <div className="flex">
              {box.buttons.map((btn) => (
                <a
                  key={btn.label}
                  href={btn.href}
                  target={btn.external ? "_blank" : "_self"}
                  rel={btn.external ? "noopener noreferrer" : undefined}
                  className="uppercase text-[0.85em] px-[1.5em] max-3xl:px-[1.25em] max-xl:px-[1em] max-lg:px-[1.5em] max-md:px-[1.25em] max-sm:px-[1.25em] border-l border-white/20 flex items-center transition-colors duration-300 hover:text-black hover:bg-orange-500"
                >
                  {btn.label}
                </a>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="px-[25px] pt-[25px] pb-[100px] max-5xl:pb-[50px] max-3xl:pr-[40px] max-xl:pr-[25px] max-lg:pb-[40px] max-md:pb-[37.5px] max-sm:pb-[30px] max-xs:pb-[22.5px] max-xs:px-[22.5px] text-[14px] max-xs:text-[12px] text-white/70 border-b border-white/20 h-full leading-[1.65]">
            {box.text}
          </div>
        </div>
      ))}
    </div>
  );
}
