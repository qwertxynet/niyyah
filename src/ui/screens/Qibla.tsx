import { useEffect, useMemo, useRef } from 'react';
import { compassPoint, compassPointLong, distanceToKaaba, qiblaBearing, turnBetween } from '../../domain/qibla';
import { useStore } from '../../domain/store';
import { buzz } from '../useCountUp';
import { useHeading } from '../useHeading';

const C = 160;
/** Within this many degrees the phone counts as facing the Qibla. */
const ALIGNED_DEG = 4;

const fmtKm = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

function polar(r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [C + r * Math.cos(rad), C + r * Math.sin(rad)];
}

function starPath(r: number, rot: number): string {
  const inner = (r * Math.cos(Math.PI / 4)) / Math.cos(Math.PI / 8);
  const pts: string[] = [];
  for (let i = 0; i < 16; i += 1) {
    const [x, y] = polar(i % 2 === 0 ? r : inner, rot + i * 22.5);
    pts.push(`${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

/** Ticks, numerals and ornament: everything that turns with north. */
function DialFace() {
  const ticks = useMemo(() => {
    const out: { d: string; major: boolean; cardinal: boolean }[] = [];
    for (let deg = 0; deg < 360; deg += 5) {
      const cardinal = deg % 90 === 0;
      const major = deg % 30 === 0;
      const inner = cardinal ? 122 : major ? 127 : 132;
      const [x1, y1] = polar(140, deg);
      const [x2, y2] = polar(inner, deg);
      out.push({ d: `M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}`, major, cardinal });
    }
    return out;
  }, []);

  return (
    <g>
      <circle cx={C} cy={C} r={154} className="qd-bezel" />
      <circle cx={C} cy={C} r={143} className="qd-ring" />
      <circle cx={C} cy={C} r={119} className="qd-ring qd-ring-faint" />
      {ticks.map((tick) => (
        <path
          key={tick.d}
          d={tick.d}
          className={tick.cardinal ? 'qd-tick qd-tick-cardinal' : tick.major ? 'qd-tick qd-tick-major' : 'qd-tick'}
        />
      ))}
      {[30, 60, 120, 150, 210, 240, 300, 330].map((deg) => {
        const [x, y] = polar(106, deg);
        return (
          <text key={deg} x={x} y={y} className="qd-num" transform={`rotate(${deg} ${x} ${y})`}>
            {deg}
          </text>
        );
      })}
      {(['N', 'E', 'S', 'W'] as const).map((label, index) => {
        const deg = index * 90;
        const [x, y] = polar(104, deg);
        return (
          <text
            key={label}
            x={x}
            y={y}
            className={label === 'N' ? 'qd-cardinal qd-north' : 'qd-cardinal'}
            transform={`rotate(${deg} ${x} ${y})`}
          >
            {label}
          </text>
        );
      })}
      <path d={starPath(84, 0)} className="qd-star" />
      <path d={starPath(84, 22.5)} className="qd-star qd-star-faint" />
      <path d={starPath(46, 0)} className="qd-star qd-star-faint" />
    </g>
  );
}

function Kaaba() {
  return (
    <g className="qd-kaaba">
      <rect x={-11} y={-12} width={22} height={24} rx={2} className="qd-kaaba-body" />
      <rect x={-11} y={-7} width={22} height={3.6} className="qd-kaaba-band" />
      <rect x={3.5} y={1} width={4.5} height={11} rx={0.8} className="qd-kaaba-door" />
    </g>
  );
}

export function Qibla() {
  const { settings } = useStore();
  const { heading, state, request } = useHeading();
  const place = settings.place;

  const bearing = place ? qiblaBearing(place.lat, place.lng) : 0;
  const distance = place ? distanceToKaaba(place.lat, place.lng) : 0;
  const live = state === 'active' && heading !== null;

  // Keep the dial's rotation continuous so 359° → 1° turns 2°, not 358°.
  const rotation = useRef(0);
  if (live) {
    rotation.current += turnBetween(rotation.current, -heading);
  } else if (state !== 'checking') {
    rotation.current += turnBetween(rotation.current, 0);
  }
  const dialRot = rotation.current;
  const needleScreen = dialRot + bearing;

  const turn = live ? turnBetween(heading, bearing) : null;
  const aligned = turn !== null && Math.abs(turn) <= ALIGNED_DEG;

  const wasAligned = useRef(false);
  useEffect(() => {
    if (aligned && !wasAligned.current) buzz(35);
    wasAligned.current = aligned;
  }, [aligned]);

  if (!place) {
    return (
      <div className="empty">
        <h3>No location yet</h3>
        <p>Add a city in Settings to find the Qibla.</p>
      </div>
    );
  }

  const deg = Math.round(bearing);
  const city = place.label.split(',')[0];

  let headline: string;
  let detail: string;
  if (aligned) {
    headline = 'You are facing the Qibla';
    detail = 'Hold steady — the Kaaba is straight ahead.';
  } else if (turn !== null) {
    const amount = Math.round(Math.abs(turn));
    headline = `Turn ${turn > 0 ? 'right' : 'left'} ${amount}°`;
    detail = 'Keep the phone flat and turn until the Kaaba reaches the top marker.';
  } else if (state === 'needs-permission') {
    headline = `${deg}° from north`;
    detail = 'Allow motion access to turn the dial with your phone.';
  } else if (state === 'denied') {
    headline = `${deg}° from north`;
    detail = 'Motion access was refused, so the dial stays fixed with north at the top.';
  } else if (state === 'checking') {
    headline = 'Finding north…';
    detail = 'Lay your phone flat for a moment.';
  } else {
    headline = `${deg}° from north`;
    detail = `No compass on this device. With north at the top, face ${deg}° clockwise — ${compassPointLong(bearing)}.`;
  }

  return (
    <div className="qibla fade-in">
      <header className="screen-head">
        <h1>Qibla</h1>
        <p>Direction of the Kaaba from {city}</p>
      </header>

      <section className={aligned ? 'compass is-aligned' : live ? 'compass is-live' : 'compass'}>
        <div className="compass-arabic" aria-hidden="true">
          القبلة
        </div>

        <div className="dial-wrap">
          <svg
            className="dial"
            viewBox="0 0 320 320"
            role="img"
            aria-label={`Compass. The Qibla is ${deg} degrees from north, ${compassPointLong(bearing)}.`}
          >
            <defs>
              <linearGradient id="qd-needle" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0" stopColor="#c39a55" />
                <stop offset="1" stopColor="#f3dfb2" />
              </linearGradient>
              <radialGradient id="qd-glow" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0.55" stopColor="#e7d2a8" stopOpacity="0" />
                <stop offset="0.86" stopColor="#e7d2a8" stopOpacity="0.32" />
                <stop offset="1" stopColor="#e7d2a8" stopOpacity="0" />
              </radialGradient>
            </defs>

            <circle cx={C} cy={C} r={160} className="qd-halo" fill="url(#qd-glow)" />

            <g className="qd-rotor" style={{ transform: `rotate(${dialRot}deg)` }}>
              <DialFace />
            </g>

            {/* The needle is drawn in screen space so it never lags the dial. */}
            <g className="qd-rotor" style={{ transform: `rotate(${needleScreen}deg)` }}>
              <path d={`M${C} ${C + 46} L${C - 5} ${C} L${C} ${C - 64} L${C + 5} ${C} Z`} className="qd-needle" />
              <path d={`M${C} ${C + 46} L${C - 5} ${C} L${C} ${C} Z`} className="qd-needle-tail" />
              <g transform={`translate(${C} ${C - 80})`}>
                <g style={{ transform: `rotate(${-needleScreen}deg)` }} className="qd-upright">
                  <Kaaba />
                </g>
              </g>
            </g>

            <circle cx={C} cy={C} r={9} className="qd-hub" />
            <circle cx={C} cy={C} r={3.6} className="qd-hub-core" />

            {/* Fixed marker: where the top of the phone is pointing. */}
            <path d={`M${C} 22 L${C - 7} 8 L${C + 7} 8 Z`} className="qd-lubber" />
          </svg>
        </div>

        <div className="compass-copy" aria-live="polite">
          <p className="compass-headline">{headline}</p>
          <p className="compass-detail">{detail}</p>
          {state === 'needs-permission' || state === 'denied' ? (
            <button type="button" className="compass-btn" onClick={request}>
              Use compass
            </button>
          ) : null}
        </div>
      </section>

      <div className="qibla-stats">
        <div className="card qibla-stat">
          <span className="qibla-stat-label">Bearing</span>
          <span className="qibla-stat-value tnum">
            {deg}° <small>{compassPoint(bearing)}</small>
          </span>
          <span className="qibla-stat-sub">from true north</span>
        </div>
        <div className="card qibla-stat">
          <span className="qibla-stat-label">Makkah</span>
          <span className="qibla-stat-value tnum">
            {fmtKm.format(distance)} <small>km</small>
          </span>
          <span className="qibla-stat-sub">great-circle distance</span>
        </div>
      </div>

      <div className="card-soft qibla-tip">
        <p>
          <strong>For a steady reading</strong> lay the phone flat, away from metal, magnets and speakers. If the dial
          drifts, move the phone in a slow figure-8 to recalibrate. Phone compasses point to magnetic north, which can
          differ from true north by a few degrees depending on where you are.
        </p>
      </div>
    </div>
  );
}
