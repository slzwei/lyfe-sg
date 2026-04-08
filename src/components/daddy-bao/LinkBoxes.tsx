"use client";

import ImageSlider from "./ImageSlider";

interface LinkBox {
  title: string;
  chinese: string;
  images: string[];
  buttons: { label: string; href: string; external?: boolean }[];
  text: React.ReactNode;
}

const BOXES: LinkBox[] = [
  {
    title: "Our Menu",
    chinese: "菜單",
    images: [
      "/upcoming/site-content/uploads/2025/04/DaddyBaoApril2025-01923.jpg",
      "/upcoming/site-content/uploads/2022/08/menu_2.jpg",
      "/upcoming/site-content/uploads/2024/03/TeoDellaTorre_DSCF7597.jpg",
    ],
    buttons: [{ label: "VIEW MENU", href: "#" }],
    text: (
      <p>
        We want a meal at Daddy Bao to feel special, whatever the occasion, without breaking the
        bank. That&apos;s why we take our time to prepare the food and drinks.
      </p>
    ),
  },
  {
    title: "BOOKINGS",
    chinese: "我們的故事",
    images: ["/upcoming/site-content/uploads/2022/08/booking-opening-times.jpg"],
    buttons: [{ label: "BOOK NOW", href: "#", external: true }],
    text: (
      <p>
        We&apos;d love to have you in for a meal with us at Daddy Bao. We recommend booking but
        we&apos;d be equally as happy to see you if you just want to walk in. Please note, we regard
        a place at the bar the same as a table for two. If you have a preference, please add this to
        your booking note and we&apos;ll do our best to accommodate.
      </p>
    ),
  },
  {
    title: "OUR OTHER SITES",
    chinese: "我們的故事",
    images: [
      "/upcoming/site-content/uploads/2022/08/1.jpeg",
      "/upcoming/site-content/uploads/2022/08/DSC06463-149-min-scaled.jpg",
      "/upcoming/site-content/uploads/2024/07/DSC04518.jpg",
      "/upcoming/site-content/uploads/2024/08/1F5A9181.jpg",
    ],
    buttons: [
      { label: "MR BAO", href: "http://mrbao.co.uk/", external: true },
      { label: "MASTER BAO", href: "http://masterbao.co.uk/", external: true },
      { label: "Good Measure", href: "https://forgoodmeasure.co.uk", external: true },
    ],
    text: (
      <p>
        If you&apos;d like to eat with us, but aren&apos;t in South West London, luckily we&apos;ve
        got other restaurants:{" "}
        <a href="http://mrbao.co.uk/" target="_blank" rel="noopener noreferrer" className="underline">
          Mr Bao
        </a>{" "}
        in Peckham and Master Bao in Westfield London and Westfield Stratford City. They have their
        own way of doing things, but we&apos;re sure you&apos;ll be just as happy when you leave. We
        also have a cocktail bar below Daddy Bao &ndash; Good Measure &ndash; with a menu of
        Taiwanese bar snacks and unique cocktails.
      </p>
    ),
  },
  {
    title: "OUR STORY",
    chinese: "我們的故事",
    images: [
      "/upcoming/site-content/uploads/2022/08/Our-Story_1.jpg",
      "/upcoming/site-content/uploads/2022/08/Our-story_2.jpg",
      "/upcoming/site-content/uploads/2023/09/IMG_3200-3.jpg",
    ],
    buttons: [{ label: "READ STORY", href: "#" }],
    text: (
      <p>
        In 2017{" "}
        <a href="http://mrbao.co.uk/" target="_blank" rel="noopener noreferrer" className="underline">
          Mr Bao&apos;s
        </a>{" "}
        dad, aka Joe, retired after 32 years running his famed Jade Restaurant in Salisbury. We
        opened Daddy Bao in his honour, designed around the way he likes to eat.
      </p>
    ),
  },
];

export default function LinkBoxes() {
  return (
    <div id="link-boxes" className="flex flex-wrap relative max-lg:block" style={{ fontFamily: "var(--font-pt-mono), monospace" }}>
      {/* Center vertical divider */}
      <div className="absolute left-1/2 top-0 w-px h-full bg-black -translate-x-1/2 max-lg:hidden z-[1]" />

      {BOXES.map((box) => (
        <div key={box.title} className="flex-[0_1_50%] max-lg:flex-auto flex flex-col">
          {/* Image slider */}
          <div className="relative pb-[60%]">
            <ImageSlider images={box.images} />
          </div>

          {/* Title bar */}
          <div className="flex justify-between border-t border-b border-black pl-[25px] text-[18px] max-4xl:text-[17px] max-3xl:text-[16px] max-xl:text-[14px] max-lg:text-[18px] max-md:text-[17px] max-sm:text-[14px] max-xs:text-[12px]">
            <h2 className="font-bold text-[1em] uppercase m-0 py-[0.7em] max-3xl:py-[0.5em] max-xl:py-[0.7em] max-md:py-[0.6em] max-xs:py-[0.9em]">
              {box.title}{" "}
              <span className="font-normal pl-[10px] max-3xl:pl-[7.5px] max-xl:pl-[5px] max-lg:pl-[10px] max-sm:pl-[5px]" style={{ fontFamily: "var(--font-noto-sans-tc), sans-serif" }}>
                {box.chinese}
              </span>
            </h2>
            <div className="flex">
              {box.buttons.map((btn) => (
                <a
                  key={btn.label}
                  href={btn.href}
                  target={btn.external ? "_blank" : "_self"}
                  rel={btn.external ? "noopener noreferrer" : undefined}
                  className="uppercase text-[0.85em] px-[1.5em] max-3xl:px-[1.25em] max-xl:px-[1em] max-lg:px-[1.5em] max-md:px-[1.25em] max-sm:px-[1.25em] border-l border-black flex items-center transition-colors duration-300 hover:text-[#fde6d4] hover:bg-black"
                >
                  {btn.label}
                </a>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="px-[25px] pt-[25px] pb-[100px] max-5xl:pb-[50px] max-3xl:pr-[40px] max-xl:pr-[25px] max-lg:pb-[40px] max-md:pb-[37.5px] max-sm:pb-[30px] max-xs:pb-[22.5px] max-xs:px-[22.5px] text-[14px] max-xs:text-[12px] border-b border-black h-full leading-[1.65]">
            {box.text}
          </div>
        </div>
      ))}
    </div>
  );
}
