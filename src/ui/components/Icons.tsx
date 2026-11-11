import type { ReactElement, SVGProps } from 'react';

export type IconName =
  | 'check'
  | 'checkCircle'
  | 'circle'
  | 'dash'
  | 'moon'
  | 'sun'
  | 'clock'
  | 'pin'
  | 'close'
  | 'chevron'
  | 'bell'
  | 'calendar'
  | 'sliders'
  | 'download'
  | 'upload'
  | 'refresh'
  | 'plus'
  | 'minus'
  | 'spark'
  | 'shield'
  | 'location'
  | 'arrowRight'
  | 'compass'
  | 'star'
  | 'book'
  | 'focus'
  | 'rows'
  | 'play'
  | 'pause'
  | 'headphones'
  | 'trash';

const paths: Record<IconName, ReactElement> = {
  check: <path d="m5 13 4 4L19 7" />,
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
    </>
  ),
  circle: <circle cx="12" cy="12" r="8" />,
  dash: <path d="M8 12h8" />,
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s6.5-6.1 6.5-11a6.5 6.5 0 1 0-13 0C5.5 14.9 12 21 12 21Z" />
      <circle cx="12" cy="10" r="2.4" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  chevron: <path d="m9 6 6 6-6 6" />,
  bell: (
    <>
      <path d="M18 15.5V11a6 6 0 1 0-12 0v4.5L4.5 18h15L18 15.5Z" />
      <path d="M9.5 21a2.5 2.5 0 0 0 5 0" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </>
  ),
  sliders: (
    <>
      <path d="M5 6h14M5 12h14M5 18h14" />
      <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
      <circle cx="8" cy="18" r="2" fill="currentColor" stroke="none" />
    </>
  ),
  download: <path d="M12 4v10m0 0 3.5-3.5M12 14l-3.5-3.5M5 18h14" />,
  upload: <path d="M12 15V5m0 0 3.5 3.5M12 5 8.5 8.5M5 19h14" />,
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.3-5.6" />
      <path d="M20 4v5h-5" />
    </>
  ),
  plus: <path d="M12 6v12M6 12h12" />,
  minus: <path d="M6 12h12" />,
  spark: (
    <>
      <path d="M12 3.5 13.7 9l5.3 1.7-5.3 1.7L12 18l-1.7-5.6L5 10.7 10.3 9 12 3.5Z" />
      <path d="M18.5 17.5 19.2 19l1.5.7-1.5.7-.7 1.5-.7-1.5-1.5-.7 1.5-.7.7-1.5Z" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.5 20 6v6c0 4.2-3.3 7.5-8 8.5-4.7-1-8-4.3-8-8.5V6l8-2.5Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  location: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </>
  ),
  arrowRight: <path d="M5 12h14m0 0-5-5m5 5-5 5" />,
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </>
  ),
  book: (
    <>
      <path d="M5 4.5h9.5A3.5 3.5 0 0 1 18 8v11.5H8.5A3.5 3.5 0 0 1 5 16V4.5Z" />
      <path d="M5 16a3 3 0 0 1 3-3h10M9 8.5h5" />
    </>
  ),
  // One line on its own: the reader's one-ayah-at-a-time mode.
  focus: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 12h8" />
    </>
  ),
  rows: <path d="M5 7h14M5 12h14M5 17h9" />,
  play: <path d="M8 5.5v13l10.5-6.5L8 5.5Z" fill="currentColor" strokeLinejoin="round" />,
  pause: (
    <>
      <rect x="7" y="5.5" width="3.4" height="13" rx="1" fill="currentColor" />
      <rect x="13.6" y="5.5" width="3.4" height="13" rx="1" fill="currentColor" />
    </>
  ),
  headphones: (
    <>
      <path d="M4.5 15v-3a7.5 7.5 0 0 1 15 0v3" />
      <rect x="3.5" y="14" width="4" height="6" rx="1.5" />
      <rect x="16.5" y="14" width="4" height="6" rx="1.5" />
    </>
  ),
  trash: <path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" />,
  // Eight-point star (two overlapping squares), the khatam of the background pattern.
  star: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="0.6" />
      <rect x="6" y="6" width="12" height="12" rx="0.6" transform="rotate(45 12 12)" />
    </>
  ),
};

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.8,
  ...rest
}: { name: IconName; size?: number; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}
