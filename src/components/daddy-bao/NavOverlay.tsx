"use client";

interface NavOverlayProps {
  isOpen: boolean;
}

export default function NavOverlay({ isOpen }: NavOverlayProps) {
  return (
    <nav
      className={`nav-overlay fixed top-0 left-0 z-[98] h-screen w-[640px] max-lg:w-full bg-[#111] overflow-y-auto flex flex-col justify-between ${
        isOpen ? "nav-slide-open" : ""
      }`}
      style={{ fontFamily: "var(--font-pt-mono), monospace" }}
    >
      <div className="pt-[120px] max-lg:pt-[100px] px-[40px] xl:px-[35px] lg:px-[30px] sm:px-[25px]">
        <ul className="list-none m-0 p-0">
          <li className="nav-menu-item border-t border-white/20 py-[12.5px] max-sm:py-[10px]">
            <a href="#services" className="uppercase text-[28px] 3xl:text-[26px] xl:text-[24px] lg:text-[22px] md:text-[20px] sm:text-[18px] max-xs:text-[16px] text-white/50 hover:text-white transition-colors duration-300 block">
              Our Services
            </a>
          </li>

          <li className="nav-menu-item border-t border-white/20 py-[12.5px] max-sm:py-[10px]">
            <a href="#culture" className="uppercase text-[28px] 3xl:text-[26px] xl:text-[24px] lg:text-[22px] md:text-[20px] sm:text-[18px] max-xs:text-[16px] text-white/50 hover:text-white transition-colors duration-300 block">
              Our Culture
            </a>
          </li>

          <li className="nav-menu-item border-t border-white/20 py-[12.5px] max-sm:py-[10px]">
            <a href="#story" className="uppercase text-[28px] 3xl:text-[26px] xl:text-[24px] lg:text-[22px] md:text-[20px] sm:text-[18px] max-xs:text-[16px] text-white/50 hover:text-white transition-colors duration-300 block">
              Our Story
            </a>
          </li>

          <li className="nav-menu-item border-t border-white/20 py-[12.5px] max-sm:py-[10px]">
            <a href="#careers" className="uppercase text-[28px] 3xl:text-[26px] xl:text-[24px] lg:text-[22px] md:text-[20px] sm:text-[18px] max-xs:text-[16px] text-white/50 hover:text-white transition-colors duration-300 block">
              Careers
            </a>
          </li>

          <li className="nav-menu-item border-t border-b border-white/20 py-[12.5px] max-sm:py-[10px]">
            <a href="/candidate/login" className="uppercase text-[28px] 3xl:text-[26px] xl:text-[24px] lg:text-[22px] md:text-[20px] sm:text-[18px] max-xs:text-[16px] text-white hover:text-orange-400 transition-colors duration-300 block font-bold">
              Apply Now
            </a>
          </li>
        </ul>
      </div>

      {/* Nav footer */}
      <div className="nav-footer-content px-[40px] xl:px-[35px] lg:px-[30px] sm:px-[25px] pb-[30px] text-white/50 text-[15px] xl:text-[14px] sm:text-[12px]">
        <div className="flex justify-between flex-wrap gap-y-[20px]">
          <p className="text-white uppercase leading-[1.75] hidden sm:block">
            Singapore
          </p>
          <div>
            <p className="leading-[1.75]">
              Mon - Fri / 9am-6pm SGT
            </p>
            <div className="mt-[15px] space-y-[5px]">
              <a href="mailto:hello@lyfe.sg" className="block hover:text-white transition-colors">hello@lyfe.sg</a>
            </div>
          </div>
        </div>

        <div className="mt-[30px] border-t-2 border-white/35 pt-[20px] flex justify-between items-center flex-wrap gap-[10px]">
          <ul className="flex items-center gap-[15px] list-none m-0 p-0 text-[13px] sm:text-[12px]">
            <li><a href="#careers" className="hover:text-white transition-colors uppercase">Careers</a></li>
            <li><a href="#" className="hover:text-white transition-colors uppercase">Privacy</a></li>
          </ul>
          <p className="uppercase">&copy;LYFE2026</p>
        </div>
      </div>
    </nav>
  );
}
