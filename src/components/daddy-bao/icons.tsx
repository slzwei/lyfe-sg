export function InstagramIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect fill="none" height="256" width="256" />
      <circle cx="128" cy="128" fill="none" r="40" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="8" />
      <rect fill="none" height="184" rx="48" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="8" width="184" x="36" y="36" />
      <circle cx="180" cy="76" r="8" fill="currentColor" />
    </svg>
  );
}

export function LocationPinIcon({ className = "" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15.55 21.994" className={className}>
      <path
        fill="currentColor"
        d="M3731.584,24.448a7.273,7.273,0,0,0-7.014,9.2,7.132,7.132,0,0,0,.61,1.525c.062.116.128.23.2.342l5.485,9.5c.011.02.022.042.035.061a.833.833,0,0,0,1.374,0l.024-.041,5.494-9.517.2-.344a7.277,7.277,0,0,0-6.4-10.729Zm0,10.325a3.05,3.05,0,1,1,3.05-3.05A3.05,3.05,0,0,1,3731.583,34.773Z"
        transform="translate(-3723.809 -23.947)"
      />
    </svg>
  );
}

export function MuteIcon({ muted, className = "" }: { muted: boolean; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" xmlSpace="preserve" viewBox="0 0 275 254" className={className}>
      <path
        fill="currentColor"
        d="M164,1.3c-3.5-1.9-7.7-1.7-11,0.5L83.2,47.4H35c-19.3,0-35,15.7-35,35v89.1c0,19.3,15.7,35,35,35h48.2l69.9,45.7 c1.8,1.2,3.8,1.8,5.9,1.8c1.8,0,3.5-0.4,5.1-1.3c3.5-1.9,5.6-5.5,5.6-9.4V10.7C169.6,6.8,167.5,3.2,164,1.3z M79.6,196.6H35 c-13.8,0-25-11.2-25-25V82.4c0-13.8,11.2-25,25-25h44.6V196.6z M159.6,243.3c0,0.1,0,0.4-0.4,0.7c-0.4,0.2-0.7,0-0.8,0l-68.9-45 V55.1l68.9-45c0.1-0.1,0.4-0.2,0.8,0c0.4,0.2,0.4,0.5,0.4,0.7V243.3z"
      />
      {muted && (
        <path
          fill="currentColor"
          d="M246.8,127.5l26.7-26.7c2-2,2-5.1,0-7.1c-2-2-5.1-2-7.1,0l-26.7,26.7L213,93.7c-2-2-5.1-2-7.1,0c-2,2-2,5.1,0,7.1l26.7,26.7 L206,154.2c-2,2-2,5.1,0,7.1c1,1,2.3,1.5,3.5,1.5s2.6-0.5,3.5-1.5l26.7-26.7l26.7,26.7c1,1,2.3,1.5,3.5,1.5s2.6-0.5,3.5-1.5 c2-2,2-5.1,0-7.1L246.8,127.5z"
        />
      )}
    </svg>
  );
}

export function DownArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 49.386 27.522" className={className}>
      <path
        d="M4630.589,960.393l-23.279,23.279-23.279-23.279"
        transform="translate(-4582.617 -958.979)"
        fill="none"
        stroke="white"
        strokeMiterlimit="10"
        strokeWidth="4"
      />
    </svg>
  );
}
