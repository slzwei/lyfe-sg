const TICKER_TEXT = "Now Recruiting \u2014 Join the Lyfe Team - ";
const SET_COUNT = 16;

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
      href="/candidate/login"
      className="absolute left-0 bottom-0 right-0 z-[3] bg-orange-600 py-[15px] max-sm:py-[12.5px] whitespace-nowrap overflow-hidden block"
    >
      <div className="ticker-inner inline-block">
        {items}
        {items}
      </div>
    </a>
  );
}
