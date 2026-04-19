"use client";

function EnvelopeIcon() {
  return (
    <svg className="w-[14px] h-[14px] inline mr-[8px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}

export default function DaddyBaoFooter() {
  return (
    <footer className="bg-black" style={{ fontFamily: "var(--font-pt-mono), monospace" }}>
      {/* Main footer content — desktop */}
      <div className="max-sm:hidden px-[40px] xl:px-[35px] pt-[45px] max-3xl:pt-[40px] max-xl:pt-[35px] pb-[20px]">
        <div className="flex justify-between text-[14px] max-3xl:text-[13px] max-xl:text-[12px] text-white/60 uppercase leading-[1.75]">
          {/* Col 1: Company */}
          <div>
            <h3 className="text-white font-bold m-0 mb-[5px]">Lyfe</h3>
            <p className="m-0">
              Financial Representatives<br />
              Singapore
            </p>
          </div>

          {/* Col 2: Office Hours */}
          <div>
            <h3 className="text-white font-bold m-0 mb-[5px]">Office Hours</h3>
            <p className="m-0">
              Mon - Fri / 9am-6pm SGT
            </p>
          </div>

          {/* Col 3: Contact */}
          <div>
            <h3 className="text-white font-bold m-0 mb-[5px]">Get In Touch</h3>
            <ul className="list-none m-0 p-0 space-y-[3px]">
              <li>
                <a href="mailto:hello@lyfe.sg" className="hover:text-white transition-colors">
                  <EnvelopeIcon />hello@lyfe.sg
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Quick Links + Logo */}
          <div className="flex gap-[25px] items-start">
            <div>
              <h3 className="text-white font-bold m-0 mb-[5px]">Quick Links</h3>
              <ul className="list-none m-0 p-0 space-y-[3px]">
                <li><a href="#services" className="hover:text-white transition-colors">Our Services</a></li>
                <li><a href="#careers" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="/candidate/login" className="hover:text-white transition-colors">Apply Now</a></li>
              </ul>
            </div>
            <a href="#" className="shrink-0">
              <img
                src="/lyfe-logo-orange-bg.png"
                alt="Lyfe"
                className="w-[60px] h-auto rounded-full"
              />
            </a>
          </div>
        </div>

        {/* Newsletter form */}
        <div className="mt-[25px]">
          <h3 className="text-white font-bold text-[14px] max-xl:text-[12px] uppercase m-0 mb-[12px]">
            Stay Updated
          </h3>
          <form className="flex flex-wrap text-[14px] max-xl:text-[12px]" onSubmit={(e) => e.preventDefault()}>
            <div className="w-full flex border-t border-b border-white py-[14px]">
              <input
                type="text"
                placeholder="FIRST NAME"
                className="w-[27%] max-lg:w-[35%] max-xs:w-1/2 bg-transparent text-white placeholder:text-white p-[2px] outline-none border-r border-white border-t-0 border-b-0 border-l-0"
                style={{ fontFamily: "inherit" }}
              />
              <input
                type="text"
                placeholder="LAST NAME"
                className="flex-1 bg-transparent border-none text-white placeholder:text-white p-[2px] pl-[28px] outline-none"
                style={{ fontFamily: "inherit" }}
              />
            </div>
            <div className="w-full flex items-end mt-[15px]">
              <input
                type="email"
                placeholder="EMAIL"
                className="flex-1 bg-transparent border-b border-white border-t-0 border-l-0 border-r-0 text-white placeholder:text-white p-[2px] outline-none"
                style={{ fontFamily: "inherit" }}
              />
              <button
                type="submit"
                className="ml-[16px] border border-white bg-transparent text-white uppercase px-[40px] py-[8px] h-[46px] cursor-pointer transition-colors duration-300 hover:bg-orange-500 hover:border-orange-500 hover:text-white text-[16px]"
                style={{ fontFamily: "inherit" }}
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Mobile footer */}
      <div className="hidden max-sm:block px-[25px] py-[25px] text-white/60 text-[12px] uppercase">
        <div className="flex flex-wrap justify-between py-[10px] border-t border-b border-white/50">
          <div className="space-y-[5px]">
            <a href="mailto:hello@lyfe.sg" className="block hover:text-white transition-colors"><EnvelopeIcon />hello@lyfe.sg</a>
          </div>
          <p className="text-white m-0">Lyfe<br />Singapore</p>
        </div>
      </div>

      {/* Footer bottom bar */}
      <div className="px-[40px] xl:px-[35px] sm:px-[25px] pb-[30px] max-sm:pb-[15px]">
        <div className="mt-[20px] max-sm:mt-0 border-t-2 border-white/35 max-sm:border-0 pt-[20px] max-sm:pt-0 flex justify-between items-center text-white/60 text-[13px] max-xs:text-[12px] uppercase">
          <ul className="flex items-center gap-[15px] list-none m-0 p-0">
            <li><a href="#careers" className="hover:text-white transition-colors">Careers</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
          </ul>
          <p className="m-0">&copy;LYFE2026</p>
        </div>
      </div>
    </footer>
  );
}
