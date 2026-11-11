import { useId } from 'react';
import type { DayArc } from '../../domain/sky';

const W = 300;
const H = 112;
const CX = W / 2;
const BASE = 96;
const RX = 132;
const RY = 78;

function point(f: number): [number, number] {
  const angle = Math.PI * (1 - f);
  return [CX + RX * Math.cos(angle), BASE - RY * Math.sin(angle)];
}

/**
 * The day as the sun sees it: an arc from Fajr to Isha with the sun (or, at
 * night, the moon) at "now" and a glowing trail behind it. Purely visual —
 * the same information is in the text beside it.
 */
export function SkyArc({ arc, current, label }: { arc: DayArc; current?: string; label: string }) {
  const id = useId().replace(/:/g, '');
  const [sx, sy] = point(arc.now);
  const path = `M ${CX - RX} ${BASE} A ${RX} ${RY} 0 0 1 ${CX + RX} ${BASE}`;

  return (
    <svg className={`sky-arc${arc.night ? ' is-night' : ''}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <defs>
        <radialGradient id={`${id}-sun`}>
          <stop offset="0" stopColor="#fff6d8" />
          <stop offset="0.55" stopColor="var(--sky-accent, #e7d2a8)" />
          <stop offset="1" stopColor="var(--sky-accent, #e7d2a8)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-trail`} x1="0" x2="1">
          <stop offset="0" stopColor="var(--sky-accent, #e7d2a8)" stopOpacity="0.15" />
          <stop offset="1" stopColor="var(--sky-accent, #e7d2a8)" stopOpacity="0.95" />
        </linearGradient>
      </defs>

      <line x1="8" x2={W - 8} y1={BASE} y2={BASE} className="sky-arc-horizon" />
      <path d={path} className="sky-arc-track" pathLength={1} />
      <path
        d={path}
        className="sky-arc-trail"
        pathLength={1}
        stroke={`url(#${id}-trail)`}
        strokeDasharray={`${arc.now} 1`}
      />

      {arc.marks.map((mark, index) => {
        const [x, y] = point(mark.f);
        const isNow = mark.key === current;
        const below = mark.f < 0.05 || mark.f > 0.95;
        // Labels sit just inside the arc, so the sun (always on the arc) never covers them.
        const angle = Math.PI * (1 - mark.f);
        const nx = Math.cos(angle) / RX;
        const ny = -Math.sin(angle) / RY;
        const len = Math.hypot(nx, ny) || 1;
        const lx = x - (nx / len) * 19;
        const ly = y - (ny / len) * 19 + 3;
        const anchor = mark.f < 0.35 ? 'start' : mark.f > 0.65 ? 'end' : 'middle';
        return (
          <g key={mark.key} className={isNow ? 'sky-arc-mark is-now' : 'sky-arc-mark'}>
            <circle cx={x} cy={y} r={isNow ? 4.2 : 3} />
            <text
              x={below ? (index === 0 ? x - 2 : x + 2) : lx}
              y={below ? BASE + 13 : ly}
              textAnchor={below ? (index === 0 ? 'start' : 'end') : anchor}
            >
              {mark.name}
            </text>
          </g>
        );
      })}

      <g className="sky-arc-body" style={{ transform: `translate(${sx}px, ${sy}px)` }}>
        {arc.night ? (
          <>
            <circle r="13" fill={`url(#${id}-sun)`} opacity="0.5" className="sky-arc-glow" />
            <path d="M3.5 -7.2A7.8 7.8 0 1 0 7.6 3.4 6.2 6.2 0 0 1 3.5 -7.2Z" className="sky-arc-moon" />
          </>
        ) : (
          <>
            <circle r="13" fill={`url(#${id}-sun)`} className="sky-arc-glow" />
            <circle r="6.5" className="sky-arc-sun" />
          </>
        )}
      </g>
    </svg>
  );
}
