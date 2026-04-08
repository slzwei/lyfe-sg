const TICKER_TEXT = "House Special - Shop Now Open - ";
const SET_COUNT = 16; // items per set — enough to fill the viewport

export default function Ticker() {
  const items = Array.from({ length: SET_COUNT }, (_, i) => (
    <span
      key={i}
      className="text-white uppercase leading-none text-[15px] max-md:text-[14px] max-sm:text-[13px] max-xs:text-[10px]"
      style={{ fontFamily: "var(--font-pt-mono), monospace" }}
    >
      {TICKER_TEXT}
    </span>
  ));

  return (
    <a
      href="https://housespecial.co.uk/"
      target="_blank"
      rel="noopener noreferrer"
      className="absolute left-0 bottom-0 right-0 z-[3] bg-black py-[15px] max-sm:py-[12.5px] whitespace-nowrap overflow-hidden block"
    >
      <div className="ticker-inner inline-block">
        {/* Two identical sets — animation shifts -50% for seamless loop */}
        {items}
        {items}
      </div>
    </a>
  );
}
