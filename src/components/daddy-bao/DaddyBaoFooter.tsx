"use client";

function EnvelopeIcon() {
  return (
    <svg className="w-[14px] h-[14px] inline mr-[8px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg className="w-[14px] h-[14px] inline mr-[8px] -scale-x-100" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
  );
}

function InstagramSvg() {
  return (
    <svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" className="w-[20px] h-[20px]" fill="currentColor">
      <rect fill="none" height="256" width="256" />
      <circle cx="128" cy="128" fill="none" r="40" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="8" />
      <rect fill="none" height="184" rx="48" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="8" width="184" x="36" y="36" />
      <circle cx="180" cy="76" r="8" />
    </svg>
  );
}

export default function DaddyBaoFooter() {
  return (
    <footer className="bg-black" style={{ fontFamily: "var(--font-pt-mono), monospace" }}>
      {/* Main footer content — desktop */}
      <div className="max-sm:hidden px-[40px] xl:px-[35px] pt-[45px] max-3xl:pt-[40px] max-xl:pt-[35px] pb-[20px]">
        <div className="flex justify-between text-[14px] max-3xl:text-[13px] max-xl:text-[12px] text-[#fde6d4]/60 uppercase leading-[1.75]">
          {/* Col 1: Address */}
          <div>
            <h3 className="text-[#fde6d4] font-bold m-0 mb-[5px]">Daddy Bao</h3>
            <p className="m-0">
              A 5 minute walk from Tooting Broadway Station.<br />
              113 Mitcham Road<br />
              Tooting, London<br />
              SW17 9PE
            </p>
          </div>

          {/* Col 2: Opening Times */}
          <div>
            <h3 className="text-[#fde6d4] font-bold m-0 mb-[5px]">Opening Times</h3>
            <p className="m-0">
              Tue - Thu / 5-9:45pm<br />
              Fri / 12-3pm + 5-10:45pm<br />
              Sat / 11.30am-10:45pm<br />
              Sun / 11.30am - 9:45pm
            </p>
          </div>

          {/* Col 3: Contact */}
          <div>
            <h3 className="text-[#fde6d4] font-bold m-0 mb-[5px]">Get In Touch</h3>
            <ul className="list-none m-0 p-0 space-y-[3px]">
              <li>
                <a href="mailto:info@daddybao.com" className="hover:text-[#fde6d4] transition-colors">
                  <EnvelopeIcon />info@daddybao.com
                </a>
              </li>
              <li>
                <a href="tel:07956734548" className="hover:text-[#fde6d4] transition-colors">
                  <PhoneIcon />07956 734548
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Other sites + Logo */}
          <div className="flex gap-[25px] items-start">
            <div>
              <h3 className="text-[#fde6d4] font-bold m-0 mb-[5px]">Our Other Sites</h3>
              <ul className="list-none m-0 p-0 space-y-[3px]">
                <li><a href="https://forgoodmeasure.co.uk/" target="_blank" rel="noopener noreferrer" className="hover:text-[#fde6d4] transition-colors">Good Measure</a></li>
                <li><a href="http://mrbao.co.uk/" target="_blank" rel="noopener noreferrer" className="hover:text-[#fde6d4] transition-colors">Mr Bao</a></li>
                <li><a href="http://masterbao.co.uk/" target="_blank" rel="noopener noreferrer" className="hover:text-[#fde6d4] transition-colors">Master Bao</a></li>
              </ul>
            </div>
            <a href="#" className="shrink-0">
              <img
                src="/upcoming/site-content/uploads/2022/08/Daddy_Bao_Main_Logo.png"
                alt="Daddy Bao"
                className="w-[60px] h-auto"
              />
            </a>
          </div>
        </div>

        {/* Newsletter form */}
        <div className="mt-[25px]">
          <h3 className="text-[#fde6d4] font-bold text-[14px] max-xl:text-[12px] uppercase m-0 mb-[12px]">
            Sign up to our newsletter
          </h3>
          <form className="flex flex-wrap text-[14px] max-xl:text-[12px]" onSubmit={(e) => e.preventDefault()}>
            <div className="w-full flex border-t border-b border-[#fde6d4] py-[14px]">
              <input
                type="text"
                placeholder="FIRST NAME"
                className="w-[27%] max-lg:w-[35%] max-xs:w-1/2 bg-transparent text-[#fde6d4] placeholder:text-[#fde6d4] p-[2px] outline-none border-r border-[#fde6d4] border-t-0 border-b-0 border-l-0"
                style={{ fontFamily: "inherit" }}
              />
              <input
                type="text"
                placeholder="SECOND NAME"
                className="flex-1 bg-transparent border-none text-[#fde6d4] placeholder:text-[#fde6d4] p-[2px] pl-[28px] outline-none"
                style={{ fontFamily: "inherit" }}
              />
            </div>
            <div className="w-full flex items-end mt-[15px]">
              <input
                type="email"
                placeholder="EMAIL"
                className="flex-1 bg-transparent border-b border-[#fde6d4] border-t-0 border-l-0 border-r-0 text-[#fde6d4] placeholder:text-[#fde6d4] p-[2px] outline-none"
                style={{ fontFamily: "inherit" }}
              />
              <button
                type="submit"
                className="ml-[16px] border border-[#fde6d4] bg-transparent text-[#fde6d4] uppercase px-[40px] py-[8px] h-[46px] cursor-pointer transition-colors duration-300 hover:bg-[#fde6d4] hover:text-black text-[16px]"
                style={{ fontFamily: "inherit" }}
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Mobile footer */}
      <div className="hidden max-sm:block px-[25px] py-[25px] text-[#fde6d4]/60 text-[12px] uppercase">
        <div className="flex flex-wrap justify-between py-[10px] border-t border-b border-[#fde6d4]/50">
          <div className="space-y-[5px]">
            <a href="mailto:info@daddybao.com" className="block hover:text-[#fde6d4] transition-colors"><EnvelopeIcon />info@daddybao.com</a>
            <a href="tel:07956734548" className="block hover:text-[#fde6d4] transition-colors"><PhoneIcon />07956 734548</a>
          </div>
          <p className="text-[#fde6d4] m-0">113 Mitcham Rd, Tooting<br />London, SW17 9PE</p>
        </div>
      </div>

      {/* Footer bottom bar */}
      <div className="px-[40px] xl:px-[35px] sm:px-[25px] pb-[30px] max-sm:pb-[15px]">
        <div className="mt-[20px] max-sm:mt-0 border-t-2 border-[#fde6d4]/35 max-sm:border-0 pt-[20px] max-sm:pt-0 flex justify-between items-center text-[#fde6d4]/60 text-[13px] max-xs:text-[12px] uppercase">
          <ul className="flex items-center gap-[15px] list-none m-0 p-0">
            <li>
              <a href="https://www.instagram.com/daddybao/" target="_blank" rel="noopener noreferrer" className="hover:text-[#fde6d4] transition-colors">
                <InstagramSvg />
              </a>
            </li>
            <li><a href="#" className="hover:text-[#fde6d4] transition-colors">Careers</a></li>
            <li><a href="#" className="hover:text-[#fde6d4] transition-colors">FAQs</a></li>
            <li><a href="#" className="hover:text-[#fde6d4] transition-colors">Privacy</a></li>
            <li><a href="https://6of1.co.uk/" target="_blank" rel="noopener noreferrer" className="hover:text-[#fde6d4] transition-colors">6 of 1</a></li>
          </ul>
          <p className="m-0">&#169;DADDYBAO2022</p>
        </div>
      </div>
    </footer>
  );
}
