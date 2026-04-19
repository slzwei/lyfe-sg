"use client";

import { useRef, useEffect } from "react";
import { DownArrowIcon } from "./icons";
import Ticker from "./Ticker";

interface HeroSectionProps {
  isMuted: boolean;
}

export default function HeroSection({ isMuted }: HeroSectionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = isMuted;
    if (isMuted) {
      v.setAttribute("muted", "");
    } else {
      v.removeAttribute("muted");
    }
  }, [isMuted]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.setAttribute("muted", "");
    v.play().catch(() => {});
  }, []);

  const scrollDown = () => {
    document.getElementById("link-boxes")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative h-screen min-h-[696px] max-lg:min-h-[550px] max-sm:min-h-[400px] flex items-end justify-center overflow-hidden">
      {/* Video background — replace src with Lyfe video when available */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        poster="/lyfe-logo-orange-bg.png"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full z-[1] object-cover"
      >
        {/* TODO: Replace with Lyfe hero video */}
      </video>

      {/* Gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70 z-[2] pointer-events-none" />

      {/* Hero content */}
      <div
        className="relative z-[3] w-[40%] 5xl:w-[40%] max-5xl:w-[50%] max-3xl:w-[60%] max-xl:w-[75%] max-lg:w-full mx-auto pb-[95px] max-5xl:pb-[75px] max-xl:pb-[65px] max-sm:pb-[60px] text-center px-[25px] max-xs:px-[15px]"
        style={{ fontFamily: "var(--font-pt-mono), monospace" }}
      >
        <h1 className="text-white text-center uppercase text-[44px] max-5xl:text-[40px] max-3xl:text-[38px] max-xl:text-[36px] max-lg:text-[34px] max-md:text-[30px] max-sm:text-[22px] max-xs:text-[18px] leading-[1.05] font-normal mb-[0.5em]">
          Build Your Future<br />
          In Financial Advisory
        </h1>

        <p className="text-white/70 text-[16px] max-sm:text-[14px] max-xs:text-[12px] mb-[1.5em] leading-[1.6]">
          We&apos;re a team of trusted financial representatives helping
          Singaporeans protect what matters most.
        </p>

        <button
          onClick={scrollDown}
          className="bg-transparent border-none p-0 cursor-pointer"
          aria-label="Scroll down"
        >
          <DownArrowIcon className="w-[38px] max-5xl:w-[34px] max-xl:w-[32px] max-lg:w-[30px] max-sm:w-[25.5px] max-xs:w-[24px]" />
        </button>
      </div>

      {/* Ticker */}
      <Ticker />
    </section>
  );
}
