"use client";

import { useState } from "react";
import { InstagramIcon, LocationPinIcon, MuteIcon } from "./icons";

interface HeaderProps {
  isScrolled: boolean;
  isNavOpen: boolean;
  isMuted: boolean;
  onToggleNav: () => void;
  onToggleMute: () => void;
}

export default function Header({ isScrolled, isNavOpen, isMuted, onToggleNav, onToggleMute }: HeaderProps) {
  const [servicesOpen, setServicesOpen] = useState(false);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-[99] transition-all duration-300 ${
        isScrolled ? "py-[12px]" : "py-[15px]"
      }`}
      style={{ fontFamily: "var(--font-pt-mono), monospace" }}
    >
      {/* Scroll background */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 ${
          isScrolled ? "opacity-100" : "opacity-0"
        }`}
      />

      <div className="relative flex items-center px-[25px] xl:px-[40px] max-sm:px-[25px] max-xs:px-[20px]">
        {/* Left: menu buttons */}
        <div className="flex-1 flex items-center gap-[14px] max-sm:gap-[10px] whitespace-nowrap max-xs:scale-[0.85] max-xs:origin-left">
          {/* Hamburger */}
          <button
            onClick={onToggleNav}
            className={`relative w-[34px] h-[22px] max-sm:w-[28px] max-sm:h-[18px] cursor-pointer bg-transparent border-none p-0 ${isNavOpen ? "hamburger-active" : ""}`}
            aria-label="Toggle menu"
          >
            <span className={`hamburger-line absolute left-0 w-full h-[2px] bg-white block ${isNavOpen ? "hamburger-top" : ""}`} style={{ top: 0 }} />
            <span className={`hamburger-line absolute left-0 w-full h-[2px] bg-white block ${isNavOpen ? "hamburger-mid" : ""}`} style={{ top: "50%", marginTop: "-1px" }} />
            <span className={`hamburger-line absolute left-0 w-full h-[2px] bg-white block ${isNavOpen ? "hamburger-bot" : ""}`} style={{ bottom: 0 }} />
          </button>

          {/* Mute */}
          <button
            onClick={onToggleMute}
            className={`bg-transparent border-none cursor-pointer p-0 ${isMuted ? "mute-pulse" : ""}`}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            <MuteIcon muted={isMuted} className="w-[22px] h-[22px] max-sm:w-[18px] max-sm:h-[18px] text-white" />
          </button>
        </div>

        {/* Center: logo */}
        <div className="flex-1 flex justify-center relative h-[22px]">
          {/* Main logo (round) */}
          <a href="#" className="absolute left-1/2 -translate-x-1/2 -top-[5px] transition-opacity duration-500" style={{ opacity: isScrolled ? 0 : 1 }}>
            <img
              src="/lyfe-logo-orange-bg.png"
              alt="Lyfe"
              className="h-[80px] max-sm:h-[50px] w-auto max-w-none rounded-full"
            />
          </a>
          {/* Scroll logo (compact) */}
          <img
            src="/lyfe-logo-square.png"
            alt="Lyfe"
            className="absolute left-1/2 transition-opacity duration-500 pointer-events-none rounded-full"
            style={{ height: "35px", width: "auto", top: "50%", transform: "translate(-50%, -50%)", opacity: isScrolled ? 1 : 0 }}
          />
        </div>

        {/* Right: CTA buttons */}
        <div className="flex-1 flex justify-end items-center gap-[10px] max-sm:flex-col max-sm:items-end max-sm:gap-[8px] max-sm:mt-[6px]">
          {/* Services dropdown */}
          <div
            className="relative max-sm:order-2"
            onMouseEnter={() => setServicesOpen(true)}
            onMouseLeave={() => setServicesOpen(false)}
          >
            <button className="cta-btn uppercase text-white border border-white text-[15px] max-xl:text-[13px] tracking-[0.06em] px-[14px] py-[5px] bg-transparent cursor-pointer transition-colors duration-300 hover:bg-white hover:text-black">
              Services
            </button>
            <ul
              className={`absolute top-full right-0 bg-white border border-black min-w-[180px] transition-opacity duration-200 z-10 ${
                servicesOpen ? "opacity-100 visible" : "opacity-0 invisible"
              }`}
            >
              <li className="border-b border-black">
                <a href="#services" className="block px-[15px] py-[10px] text-black text-[13px] uppercase hover:bg-black hover:text-white transition-colors">
                  Life Protection
                </a>
              </li>
              <li className="border-b border-black">
                <a href="#services" className="block px-[15px] py-[10px] text-black text-[13px] uppercase hover:bg-black hover:text-white transition-colors">
                  Savings Plans
                </a>
              </li>
              <li className="border-b border-black">
                <a href="#services" className="block px-[15px] py-[10px] text-black text-[13px] uppercase hover:bg-black hover:text-white transition-colors">
                  Retirement
                </a>
              </li>
              <li>
                <a href="#services" className="block px-[15px] py-[10px] text-black text-[13px] uppercase hover:bg-black hover:text-white transition-colors">
                  Critical Illness
                </a>
              </li>
            </ul>
          </div>

          {/* Apply */}
          <a
            href="/candidate/login"
            className="cta-btn uppercase text-white border border-white text-[15px] max-xl:text-[13px] tracking-[0.06em] px-[14px] py-[5px] max-sm:order-1 transition-colors duration-300 hover:bg-white hover:text-black"
          >
            Apply
          </a>
        </div>
      </div>
    </header>
  );
}
