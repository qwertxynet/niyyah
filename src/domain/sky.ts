import { Coordinates, PrayerTimes } from 'adhan';
import { addDays, makeParams, placeCivilDate, prayerDay, startOfDay } from './prayer-times';
import type { Settings } from './types';

/*
 * The living sky: the whole app takes the colour of the sky outside, phase by
 * phase, so the time of day can be read at a glance. Each palette keeps its
 * gradient on one side of light/dark so text stays readable everywhere on it.
 */

export type SkyPhase = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'night';

export interface Palette {
  tone: 'light' | 'dark';
  top: string;
  mid: string;
  bottom: string;
  /** Text drawn straight on the sky. */
  ink: string;
  ink2: string;
  ink3: string;
  accent: string;
  pattern: string;
  patternOpacity: number;
  /** The Today hero: always dark enough for light text. */
  heroTop: string;
  heroBottom: string;
  stars: boolean;
}

const LIGHT_TEXT = { ink: '#f7f3ff', ink2: 'rgba(247, 243, 255, 0.8)', ink3: 'rgba(247, 243, 255, 0.64)' };

const LIGHT: Record<SkyPhase, Palette> = {
  fajr: {
    tone: 'dark', top: '#1d2150', mid: '#463c70', bottom: '#865a7c', ...LIGHT_TEXT,
    accent: '#f4c7a6', pattern: '#f2c6d8', patternOpacity: 0.1, heroTop: '#262b60', heroBottom: '#5e4374', stars: false,
  },
  sunrise: {
    tone: 'light', top: '#f5d3b0', mid: '#f7e5cc', bottom: '#eaeef0', ink: '#2a2016', ink2: '#58493a', ink3: '#7f7062',
    accent: '#94571d', pattern: '#c0894d', patternOpacity: 0.16, heroTop: '#94482a', heroBottom: '#6d3122', stars: false,
  },
  dhuhr: {
    tone: 'light', top: '#9cc7eb', mid: '#cde2f3', bottom: '#edf3f7', ink: '#0f2537', ink2: '#3a5367', ink3: '#647b8d',
    accent: '#1c5a89', pattern: '#3d7cb0', patternOpacity: 0.13, heroTop: '#1d5a8f', heroBottom: '#143c62', stars: false,
  },
  asr: {
    tone: 'light', top: '#efc475', mid: '#f5dba5', bottom: '#f8eed6', ink: '#2c1f07', ink2: '#5c4720', ink3: '#806945',
    accent: '#83540c', pattern: '#b8862e', patternOpacity: 0.17, heroTop: '#82540b', heroBottom: '#5a3a0d', stars: false,
  },
  maghrib: {
    tone: 'dark', top: '#371c4c', mid: '#73375b', bottom: '#a04e4b', ...LIGHT_TEXT, ink: '#fff4ee',
    accent: '#ffc79e', pattern: '#ffb39a', patternOpacity: 0.11, heroTop: '#45204f', heroBottom: '#8c4048', stars: false,
  },
  isha: {
    tone: 'dark', top: '#0b1433', mid: '#16204a', bottom: '#2a2c5e', ...LIGHT_TEXT,
    accent: '#e8c98a', pattern: '#9fb0ff', patternOpacity: 0.1, heroTop: '#141c45', heroBottom: '#2b2d63', stars: true,
  },
  night: {
    tone: 'dark', top: '#050a1f', mid: '#0b1330', bottom: '#151b40', ...LIGHT_TEXT,
    accent: '#e8c98a', pattern: '#8f9ff0', patternOpacity: 0.09, heroTop: '#0e1636', heroBottom: '#1d2252', stars: true,
  },
};

/** Dark theme: the same sky after dusk-level dimming; always light text. */
const DARK: Record<SkyPhase, Palette> = {
  fajr: { ...LIGHT.fajr, top: '#121433', mid: '#2a2446', bottom: '#4a3449', heroTop: '#1a1d42', heroBottom: '#3d2c4d' },
  sunrise: {
    ...LIGHT.fajr, top: '#2b1b16', mid: '#33241b', bottom: '#1d1c1f', accent: '#f0b98a', pattern: '#e0a46a',
    patternOpacity: 0.1, heroTop: '#6e3520', heroBottom: '#3e1f16',
  },
  dhuhr: {
    ...LIGHT.fajr, top: '#0f2234', mid: '#132a3d', bottom: '#111c26', accent: '#9cc7eb', pattern: '#6fa5d6',
    patternOpacity: 0.1, heroTop: '#17466f', heroBottom: '#0f2d47',
  },
  asr: {
    ...LIGHT.fajr, top: '#2c2010', mid: '#2a2113', bottom: '#191610', accent: '#efc475', pattern: '#d9a64a',
    patternOpacity: 0.1, heroTop: '#6b4510', heroBottom: '#3c280b',
  },
  maghrib: { ...LIGHT.maghrib, top: '#22122f', mid: '#3e2034', bottom: '#53292c', heroTop: '#2f1636', heroBottom: '#5a2a33' },
  isha: { ...LIGHT.isha, top: '#060b1e', mid: '#0c1230', bottom: '#181a3b' },
  night: { ...LIGHT.night, top: '#03050f', mid: '#070b1d', bottom: '#0d1029' },
};

export interface SkyState {
  phase: SkyPhase;
  /** Progress through the phase, 0–1. */
  t: number;
  next: SkyPhase;
  /** Epoch ms when this phase ends. */
  endsAt: number;
}

interface Segment {
  phase: SkyPhase;
  start: number;
  end: number;
}

function sunriseFor(day: Date, settings: Settings): Date | null {
  if (!settings.place) return null;
  try {
    const pt = new PrayerTimes(new Coordinates(settings.place.lat, settings.place.lng), day, makeParams(settings));
    return Number.isFinite(pt.sunrise.getTime()) ? pt.sunrise : null;
  } catch {
    return null;
  }
}

/** The day's sky phases, from Fajr to the next Fajr. */
function segmentsFor(day: Date, settings: Settings): Segment[] {
  const today = prayerDay(day, settings);
  if (today.degraded) return [];
  const at = (key: string) => today.slots.find((slot) => slot.key === key)!;
  const nextFajr = at('isha').end.getTime();
  const sunrise = sunriseFor(startOfDay(day), settings)?.getTime() ?? at('fajr').start.getTime() + 75 * 60_000;
  const isha = at('isha').start.getTime();
  const nightStart = Math.min(isha + 90 * 60_000, nextFajr);
  const points: [SkyPhase, number][] = [
    ['fajr', at('fajr').start.getTime()],
    ['sunrise', sunrise],
    ['dhuhr', at('dhuhr').start.getTime()],
    ['asr', at('asr').start.getTime()],
    ['maghrib', at('maghrib').start.getTime()],
    ['isha', isha],
    ['night', nightStart],
  ];
  return points.map(([phase, start], index) => ({
    phase,
    start,
    end: index < points.length - 1 ? points[index + 1][1] : nextFajr,
  }));
}

export function skyAt(now: Date, settings: Settings): SkyState | null {
  if (!settings.place) return null;
  const civil = placeCivilDate(now, settings);
  const segments = [-1, 0].flatMap((offset) => segmentsFor(addDays(civil, offset), settings));
  const ms = now.getTime();
  const index = segments.findIndex((segment) => ms >= segment.start && ms < segment.end);
  if (index < 0) return null;
  const segment = segments[index];
  const following = segments[index + 1]?.phase ?? 'fajr';
  return {
    phase: segment.phase,
    t: Math.min(1, Math.max(0, (ms - segment.start) / Math.max(1, segment.end - segment.start))),
    next: following,
    endsAt: segment.end,
  };
}

// ---------- the sun arc on Today ----------

export interface ArcMark {
  key: string;
  name: string;
  /** Position along the arc, 0 (left horizon) to 1 (right horizon). */
  f: number;
}

export interface DayArc {
  marks: ArcMark[];
  /** Where "now" sits on the arc. */
  now: number;
  /** After Isha and before Fajr the moon travels the arc instead. */
  night: boolean;
}

/**
 * Lays the active prayer-day on a semicircle the way the sun moves: Fajr at
 * the left horizon, sunrise just after, Dhuhr near the top, Maghrib setting
 * on the right, Isha at the far end. At night the arc runs Isha → Fajr.
 */
export function dayArc(now: Date, settings: Settings, active: { day: Date; slots: { key: string; name: string; start: Date; end: Date }[] }): DayArc | null {
  const at = (key: string) => active.slots.find((slot) => slot.key === key);
  const fajr = at('fajr');
  const maghrib = at('maghrib');
  const isha = at('isha');
  if (!fajr || !maghrib || !isha) return null;
  const ms = now.getTime();

  if (ms >= isha.start.getTime() || ms < fajr.start.getTime()) {
    const from = isha.start.getTime();
    const to = isha.end.getTime();
    return {
      marks: [
        { key: 'isha', name: 'Isha', f: 0 },
        { key: 'fajr', name: 'Fajr', f: 1 },
      ],
      now: Math.min(1, Math.max(0, (ms - from) / Math.max(1, to - from))),
      night: true,
    };
  }

  const rise = (sunriseFor(startOfDay(active.day), settings) ?? new Date(fajr.start.getTime() + 75 * 60_000)).getTime();
  const set = maghrib.start.getTime();
  // Piecewise: Fajr→sunrise 0–0.1, the sun's path 0.1–0.88, Maghrib→Isha 0.88–1.
  const place = (t: number): number => {
    if (t <= rise) return 0.1 * Math.max(0, (t - fajr.start.getTime()) / Math.max(1, rise - fajr.start.getTime()));
    if (t <= set) return 0.1 + 0.78 * ((t - rise) / Math.max(1, set - rise));
    return 0.88 + 0.12 * Math.min(1, (t - set) / Math.max(1, isha.start.getTime() - set));
  };
  return {
    marks: active.slots.map((slot) => ({ key: slot.key, name: slot.name, f: place(slot.start.getTime()) })),
    now: place(ms),
    night: false,
  };
}

// ---------- colour ----------

function parse(color: string): [number, number, number, number] {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16), 1];
  }
  const parts = color.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 1];
  return [parts[0], parts[1], parts[2], parts[3] ?? 1];
}

export function mix(a: string, b: string, amount: number): string {
  const x = parse(a);
  const y = parse(b);
  const v = x.map((value, i) => value + (y[i] - value) * amount);
  return `rgba(${Math.round(v[0])}, ${Math.round(v[1])}, ${Math.round(v[2])}, ${Number(v[3].toFixed(3))})`;
}

/** WCAG relative luminance, for contrast checks. */
export function luminance(color: string): number {
  const [r, g, b] = parse(color).slice(0, 3).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Blend window at the end of each phase, so the sky drifts rather than jumps. */
const BLEND_FROM = 0.85;

/**
 * The palette for this moment. Colours drift into the next phase over the
 * last stretch of each one, but only when both sit on the same side of
 * light/dark — a half-way sky would leave text unreadable.
 */
export function paletteFor(sky: SkyState, theme: 'light' | 'dark'): Palette {
  const set = theme === 'dark' ? DARK : LIGHT;
  const here = set[sky.phase];
  const there = set[sky.next];
  if (here.tone !== there.tone || sky.t < BLEND_FROM) return here;
  const k = (sky.t - BLEND_FROM) / (1 - BLEND_FROM);
  const blended: Palette = { ...here };
  for (const key of ['top', 'mid', 'bottom', 'accent', 'pattern', 'heroTop', 'heroBottom', 'ink', 'ink2', 'ink3'] as const) {
    blended[key] = mix(here[key], there[key], k);
  }
  blended.stars = k > 0.5 ? there.stars : here.stars;
  return blended;
}

export function rawPalette(phase: SkyPhase, theme: 'light' | 'dark'): Palette {
  return (theme === 'dark' ? DARK : LIGHT)[phase];
}

export const SKY_LABEL: Record<SkyPhase, string> = {
  fajr: 'Dawn',
  sunrise: 'Morning',
  dhuhr: 'Midday',
  asr: 'Afternoon',
  maghrib: 'Sunset',
  isha: 'Evening',
  night: 'Night',
};
