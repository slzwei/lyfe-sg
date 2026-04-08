"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "./Header";
import NavOverlay from "./NavOverlay";
import HeroSection from "./HeroSection";
import LinkBoxes from "./LinkBoxes";
import DaddyBaoFooter from "./DaddyBaoFooter";

export default function DaddyBaoPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Body scroll lock when nav is open
  useEffect(() => {
    document.body.style.overflow = isNavOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isNavOpen]);

  const toggleNav = useCallback(() => setIsNavOpen((v) => !v), []);
  const toggleMute = useCallback(() => setIsMuted((v) => !v), []);

  return (
    <div
      className="daddy-bao bg-[#fde6d4] text-black min-h-screen"
      style={{
        "--main-logo-size": "130px",
        "--scroll-logo-size": "130px",
        "--footer-logo-size": "60px",
      } as React.CSSProperties}
    >
      <Header
        isScrolled={isScrolled}
        isNavOpen={isNavOpen}
        isMuted={isMuted}
        onToggleNav={toggleNav}
        onToggleMute={toggleMute}
      />
      <NavOverlay isOpen={isNavOpen} />
      <HeroSection isMuted={isMuted} />
      <LinkBoxes />
      <DaddyBaoFooter />
    </div>
  );
}
