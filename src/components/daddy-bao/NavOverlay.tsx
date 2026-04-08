"use client";

import { useState } from "react";
import { LocationPinIcon } from "./icons";

interface NavOverlayProps {
  isOpen: boolean;
}

interface DropdownProps {
  label: string;
  chinese: string;
  children: React.ReactNode;
}

function NavDropdown({ label, chinese, children }: DropdownProps) {
  const [open, setOpen] = useState(false);
  return (
    <li className="nav-menu-item border-t border-black/20 py-[12.5px] max-sm:py-[10px]">
      <button
        onClick={() => setOpen(!open)}
        className={`w-full text-left uppercase text-[28px] 3xl:text-[26px] xl:text-[24px] lg:text-[22px] md:text-[20px] sm:text-[18px] max-xs:text-[16px] transition-colors duration-300 bg-transparent border-none cursor-pointer p-0 ${
          open ? "text-black" : "text-black/50 hover:text-black"
        }`}
        style={{ fontFamily: "var(--font-pt-mono), monospace" }}
      >
        {label}
        <span className="float-right font-normal" style={{ fontFamily: "var(--font-noto-sans-tc), sans-serif" }}>
          {chinese}
        </span>
      </button>
      <div className={`dropdown-content ${open ? "open" : ""}`}>
        <ul className="mt-[12.5px] mb-[5px] space-y-[8px]">
          {children}
        </ul>
      </div>
    </li>
  );
}

export default function NavOverlay({ isOpen }: NavOverlayProps) {
  return (
    <nav
      className={`nav-overlay fixed top-0 left-0 z-[98] h-screen w-[640px] max-lg:w-full bg-[#fde6d4] overflow-y-auto flex flex-col justify-between ${
        isOpen ? "nav-slide-open" : ""
      }`}
      style={{ fontFamily: "var(--font-pt-mono), monospace" }}
    >
      <div className="pt-[120px] max-lg:pt-[100px] px-[40px] xl:px-[35px] lg:px-[30px] sm:px-[25px]">
        <ul className="list-none m-0 p-0">
          <li className="nav-menu-item border-t border-black/20 py-[12.5px] max-sm:py-[10px]">
            <a href="#" className="uppercase text-[28px] 3xl:text-[26px] xl:text-[24px] lg:text-[22px] md:text-[20px] sm:text-[18px] max-xs:text-[16px] text-black/50 hover:text-black transition-colors duration-300 block">
              Our Menu
              <span className="float-right font-normal" style={{ fontFamily: "var(--font-noto-sans-tc), sans-serif" }}>飲食</span>
            </a>
          </li>

          <NavDropdown label="Takeaway" chinese="交貨">
            <li>
              <a href="https://daddy-bao.square.site" target="_blank" rel="noopener noreferrer" className="text-black/30 hover:text-black/50 transition-colors text-[20px] sm:text-[16px] uppercase">
                Collection
              </a>
            </li>
            <li>
              <a href="https://deliveroo.co.uk/menu/London/tooting/daddy-bao?geohash=gcpus98zzk23" target="_blank" rel="noopener noreferrer" className="text-black/30 hover:text-black/50 transition-colors text-[20px] sm:text-[16px] uppercase">
                Delivery
              </a>
            </li>
          </NavDropdown>

          <NavDropdown label="Our Other Sites" chinese="我們的其他網站">
            <li>
              <a href="https://forgoodmeasure.co.uk" target="_blank" rel="noopener noreferrer" className="text-black/30 hover:text-black/50 transition-colors text-[20px] sm:text-[16px] uppercase">
                Good Measure
              </a>
            </li>
            <li>
              <a href="http://mrbao.co.uk/" target="_blank" rel="noopener noreferrer" className="text-black/30 hover:text-black/50 transition-colors text-[20px] sm:text-[16px] uppercase inline-flex items-center gap-[6px]">
                Mr Bao <LocationPinIcon className="w-[10px] h-[14px]" />
              </a>
            </li>
            <li>
              <a href="http://masterbao.co.uk/" target="_blank" rel="noopener noreferrer" className="text-black/30 hover:text-black/50 transition-colors text-[20px] sm:text-[16px] uppercase inline-flex items-center gap-[6px]">
                Master Bao <LocationPinIcon className="w-[10px] h-[14px]" />
              </a>
            </li>
            <li>
              <a href="https://housespecial.co.uk/" target="_blank" rel="noopener noreferrer" className="text-black/30 hover:text-black/50 transition-colors text-[20px] sm:text-[16px] uppercase">
                House Special
              </a>
            </li>
          </NavDropdown>

          <li className="nav-menu-item border-t border-black/20 py-[12.5px] max-sm:py-[10px]">
            <a href="#" className="uppercase text-[28px] 3xl:text-[26px] xl:text-[24px] lg:text-[22px] md:text-[20px] sm:text-[18px] max-xs:text-[16px] text-black/50 hover:text-black transition-colors duration-300 block">
              Our Story
              <span className="float-right font-normal" style={{ fontFamily: "var(--font-noto-sans-tc), sans-serif" }}>我們的故事</span>
            </a>
          </li>

          <li className="nav-menu-item border-t border-black/20 py-[12.5px] max-sm:py-[10px]">
            <a href="#" className="uppercase text-[28px] 3xl:text-[26px] xl:text-[24px] lg:text-[22px] md:text-[20px] sm:text-[18px] max-xs:text-[16px] text-black/50 hover:text-black transition-colors duration-300 block">
              Our Blog
              <span className="float-right font-normal" style={{ fontFamily: "var(--font-noto-sans-tc), sans-serif" }}>我們的博客</span>
            </a>
          </li>

          <li className="nav-menu-item border-t border-black/20 py-[12.5px] max-sm:py-[10px]">
            <a href="https://housespecial.co.uk/Gift-Card" target="_blank" rel="noopener noreferrer" className="uppercase text-[28px] 3xl:text-[26px] xl:text-[24px] lg:text-[22px] md:text-[20px] sm:text-[18px] max-xs:text-[16px] text-black/50 hover:text-black transition-colors duration-300 block">
              Gift Vouchers
              <span className="float-right font-normal" style={{ fontFamily: "var(--font-noto-sans-tc), sans-serif" }}>預訂座位</span>
            </a>
          </li>

          <li className="nav-menu-item border-t border-b border-black/20 py-[12.5px] max-sm:py-[10px]">
            <a href="https://www.exploretock.com/daddy-bao-london" target="_blank" rel="noopener noreferrer" className="uppercase text-[28px] 3xl:text-[26px] xl:text-[24px] lg:text-[22px] md:text-[20px] sm:text-[18px] max-xs:text-[16px] text-black hover:text-black transition-colors duration-300 block font-bold">
              Book a Table
              <span className="float-right font-normal" style={{ fontFamily: "var(--font-noto-sans-tc), sans-serif" }}>預訂座位</span>
            </a>
          </li>
        </ul>
      </div>

      {/* Nav footer */}
      <div className="nav-footer-content px-[40px] xl:px-[35px] lg:px-[30px] sm:px-[25px] pb-[30px] text-black/50 text-[15px] xl:text-[14px] sm:text-[12px]">
        <div className="flex justify-between flex-wrap gap-y-[20px]">
          <p className="text-black uppercase leading-[1.75] hidden sm:block">
            113 Mitcham Rd, Tooting<br />
            London, SW17 9PE
          </p>
          <div>
            <p className="leading-[1.75]">
              Tue - Thu / 5-9:45pm<br />
              Fri / 12-3pm + 5-10:45pm<br />
              Sat / 11.30am-10:45pm<br />
              Sun / 11.30am - 9:45pm
            </p>
            <div className="mt-[15px] space-y-[5px]">
              <a href="mailto:info@daddybao.com" className="block hover:text-black transition-colors">info@daddybao.com</a>
              <a href="tel:07956734548" className="block hover:text-black transition-colors">07956 734548</a>
            </div>
          </div>
        </div>

        <div className="mt-[30px] border-t-2 border-black/35 pt-[20px] flex justify-between items-center flex-wrap gap-[10px]">
          <ul className="flex items-center gap-[15px] list-none m-0 p-0 text-[13px] sm:text-[12px]">
            <li><a href="https://www.instagram.com/daddybao/" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors text-[20px]">&#x1f4f7;</a></li>
            <li><a href="#" className="hover:text-black transition-colors uppercase">Careers</a></li>
            <li><a href="#" className="hover:text-black transition-colors uppercase">FAQs</a></li>
            <li><a href="#" className="hover:text-black transition-colors uppercase">Privacy</a></li>
            <li><a href="https://6of1.co.uk/" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors uppercase">6 of 1</a></li>
          </ul>
          <p className="uppercase">&#169;DADDYBAO2022</p>
        </div>
      </div>
    </nav>
  );
}
