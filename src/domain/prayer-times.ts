import {
  CalculationMethod,
  Coordinates,
  HighLatitudeRule,
  Madhab,
  PrayerTimes,
  type CalculationParameters,
} from 'adhan';
import { isArabic, t } from '../i18n';
import type { MethodKey, PrayerKey, Settings } from './types';

export interface PrayerMeta {
  key: PrayerKey;
  name: string;
  arabic: string;
}

/** `name` follows the interface language: "Fajr" in English, "الفجر" in Arabic. */
function prayer(key: PrayerKey, english: string, arabic: string): PrayerMeta {
  return {
    key,
    arabic,
    get name() {
      return isArabic() ? arabic : english;
    },
  };
}

export const PRAYERS: PrayerMeta[] = [
  prayer('fajr', 'Fajr', 'الفجر'),
  prayer('dhuhr', 'Dhuhr', 'الظهر'),
  prayer('asr', 'Asr', 'العصر'),
  prayer('maghrib', 'Maghrib', 'المغرب'),
  prayer('isha', 'Isha', 'العشاء'),
];

export interface MethodMeta {
  id: MethodKey;
  label: string;
  hint: string;
}

export const METHODS: MethodMeta[] = [
  { id: 'MWL', label: 'Muslim World League', hint: 'Europe, Far East, parts of the Americas' },
  { id: 'ISNA', label: 'Islamic Society of North America', hint: 'North America' },
  { id: 'Egyptian', label: 'Egyptian General Authority', hint: 'Africa, Syria, Iraq, Lebanon, Malaysia' },
  { id: 'Karachi', label: 'University of Karachi', hint: 'Pakistan, India, Bangladesh, Afghanistan' },
  { id: 'UmmAlQura', label: 'Umm al-Qura, Makkah', hint: 'Arabian Peninsula' },
  { id: 'Dubai', label: 'Dubai', hint: 'United Arab Emirates' },
  { id: 'Kuwait', label: 'Kuwait', hint: 'Kuwait' },
  { id: 'Qatar', label: 'Qatar', hint: 'Qatar' },
  { id: 'Singapore', label: 'Singapore', hint: 'Singapore, Indonesia, Malaysia' },
  { id: 'Turkey', label: 'Diyanet İşleri', hint: 'Türkiye' },
  { id: 'Tehran', label: 'University of Tehran', hint: 'Iran' },
  { id: 'MoonsightingCommittee', label: 'Moonsighting Committee', hint: 'Seasonal, worldwide' },
];

const BUILDERS: Record<MethodKey, () => CalculationParameters> = {
  MWL: CalculationMethod.MuslimWorldLeague,
  ISNA: CalculationMethod.NorthAmerica,
  Egyptian: CalculationMethod.Egyptian,
  Karachi: CalculationMethod.Karachi,
  UmmAlQura: CalculationMethod.UmmAlQura,
  Dubai: CalculationMethod.Dubai,
  Kuwait: CalculationMethod.Kuwait,
  Qatar: CalculationMethod.Qatar,
  Singapore: CalculationMethod.Singapore,
  Turkey: CalculationMethod.Turkey,
  Tehran: CalculationMethod.Tehran,
  MoonsightingCommittee: CalculationMethod.MoonsightingCommittee,
};

export function methodLabel(id: MethodKey): string {
  const label = METHODS.find((m) => m.id === id)?.label;
  return label ? t(label) : id;
}

export function prayerMeta(key: PrayerKey): PrayerMeta {
  return PRAYERS.find((p) => p.key === key) ?? PRAYERS[0];
}

export function makeParams(settings: Settings): CalculationParameters {
  const build = BUILDERS[settings.method] ?? CalculationMethod.MuslimWorldLeague;
  const params = build();
  params.madhab = settings.madhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  if (settings.highLat === 'middle') params.highLatitudeRule = HighLatitudeRule.MiddleOfTheNight;
  else if (settings.highLat === 'seventh') params.highLatitudeRule = HighLatitudeRule.SeventhOfTheNight;
  else if (settings.highLat === 'angle') params.highLatitudeRule = HighLatitudeRule.TwilightAngle;
  return params;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function parseDayKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * The civil date currently in effect at the chosen place. Returned as a local
 * noon so that calendar arithmetic and adhan's date components stay stable.
 */
export function placeCivilDate(now: Date, settings: Settings): Date {
  const zone = settings.place?.timezone;
  if (!zone) return startOfDay(now);
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    const year = value('year');
    const month = value('month');
    const day = value('day');
    if (!year || !month || !day) return startOfDay(now);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  } catch {
    return startOfDay(now);
  }
}

/** Local calendar key, e.g. "2026-11-09". */
export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface TimesBundle {
  fajr: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
  invalid: boolean;
}

const cache = new Map<string, TimesBundle>();

function timesFor(day: Date, settings: Settings): TimesBundle {
  const place = settings.place;
  if (!place) {
    const fallback = new Date(Number.NaN);
    return { fajr: fallback, dhuhr: fallback, asr: fallback, maghrib: fallback, isha: fallback, invalid: true };
  }
  const key = [
    dateKey(day),
    place.lat.toFixed(3),
    place.lng.toFixed(3),
    settings.method,
    settings.madhab,
    settings.highLat,
  ].join('|');

  const hit = cache.get(key);
  if (hit) return hit;

  const coords = new Coordinates(place.lat, place.lng);
  const params = makeParams(settings);
  const pt = new PrayerTimes(coords, day, params);
  const bundle: TimesBundle = {
    fajr: pt.fajr,
    dhuhr: pt.dhuhr,
    asr: pt.asr,
    maghrib: pt.maghrib,
    isha: pt.isha,
    invalid: [pt.fajr, pt.dhuhr, pt.asr, pt.maghrib, pt.isha].some((d) => !Number.isFinite(d.getTime())),
  };

  // Keep the cache small — a rolling window of days is all we ever ask for.
  if (cache.size > 400) cache.clear();
  cache.set(key, bundle);
  return bundle;
}

export interface Slot {
  key: PrayerKey;
  name: string;
  arabic: string;
  start: Date;
  /** Exclusive end: the next prayer's start (Isha runs until tomorrow's Fajr). */
  end: Date;
}

export interface PrayerDay {
  /** Midnight of the Gregorian date this prayer-day is labelled with. */
  day: Date;
  key: string;
  slots: Slot[];
  /** Times at extreme latitudes can be impossible to compute. */
  degraded: boolean;
}

export function prayerDay(day: Date, settings: Settings): PrayerDay {
  const midnight = startOfDay(day);
  const times = timesFor(midnight, settings);
  const nextFajr = timesFor(addDays(midnight, 1), settings).fajr;

  const starts: Record<PrayerKey, Date> = {
    fajr: times.fajr,
    dhuhr: times.dhuhr,
    asr: times.asr,
    maghrib: times.maghrib,
    isha: times.isha,
  };

  const slots = PRAYERS.map((meta, index) => {
    const start = starts[meta.key];
    const end = index < PRAYERS.length - 1 ? starts[PRAYERS[index + 1].key] : nextFajr;
    return { key: meta.key, name: meta.name, arabic: meta.arabic, start, end };
  });

  return { day: midnight, key: dateKey(midnight), slots, degraded: times.invalid };
}

export interface Cycle {
  /** The prayer-day that owns the current window (before Fajr this is yesterday). */
  active: PrayerDay;
  today: PrayerDay;
  current: Slot | null;
  /** The next adhan. */
  next: { slot: Slot; at: Date } | null;
  degraded: boolean;
}

/** Which prayer window the user is inside right now, plus what comes next. */
export function cycleAt(now: Date, settings: Settings): Cycle {
  const civil = placeCivilDate(now, settings);
  const today = prayerDay(civil, settings);
  const yesterday = prayerDay(addDays(civil, -1), settings);

  const beforeFajr = today.slots[0]?.start ? now < today.slots[0].start : false;
  const active = beforeFajr ? yesterday : today;

  const current =
    active.slots.find((slot) => now >= slot.start && now < slot.end) ?? active.slots[active.slots.length - 1] ?? null;

  let next: Cycle['next'] = null;
  if (current) {
    const index = active.slots.findIndex((slot) => slot.key === current.key);
    const following = active.slots[index + 1];
    if (following) next = { slot: following, at: following.start };
    else {
      const tomorrow = prayerDay(addDays(civil, 1), settings);
      const fajr = tomorrow.slots[0];
      if (fajr) next = { slot: fajr, at: fajr.start };
    }
  }

  return { active, today, current, next, degraded: today.degraded || yesterday.degraded };
}

/**
 * Time left for display. `coarse` (minutes-only countdown) never shows
 * seconds: "1 h 05 min", "12 min", "under a minute".
 */
export function fmtLeft(ms: number, coarse: boolean): string {
  if (!coarse) return formatOffset(ms);
  if (!Number.isFinite(ms)) return '—';
  if (ms < 60_000) return t('under a minute');
  const minutes = Math.ceil(ms / 60_000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return m > 0 ? t('{h} h {m} min', { h, m: `${m}`.padStart(2, '0') }) : t('{h} h', { h });
  return t('{m} min', { m });
}

export function formatOffset(ms: number): string {
  if (!Number.isFinite(ms)) return '—';
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return t('{h}h {m}m', { h, m: `${m}`.padStart(2, '0') });
  if (m > 0) return t('{m}m {s}s', { m, s: `${s}`.padStart(2, '0') });
  return t('{s}s', { s });
}
