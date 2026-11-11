import { intlLocale, language, t } from '../i18n';
import type { TimeFormat } from './types';

/**
 * Times belong to the place they were calculated for: a user in Manchester who
 * looks up Makkah should read Makkah's wall clock, not their own. App sets this
 * once from the chosen place; everything else just formats.
 */
let displayZone: string | undefined;

export function setDisplayTimeZone(zone: string | undefined) {
  displayZone = zone;
}

export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

const cache = new Map<string, Intl.DateTimeFormat>();

function formatter(key: string, base: 'en-US' | 'en-GB', options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const zone = displayZone;
  const locale = intlLocale(base);
  const id = `${locale}|${key}|${zone ?? 'local'}`;
  let found = cache.get(id);
  if (!found) {
    found = new Intl.DateTimeFormat(locale, zone ? { ...options, timeZone: zone } : options);
    cache.set(id, found);
  }
  return found;
}

export function fmtTime(date: Date, format: TimeFormat): string {
  if (!Number.isFinite(date.getTime())) return '—';
  return formatter('time', 'en-US', { hour: 'numeric', minute: '2-digit', hour12: format === '12h' }).format(date);
}

/** "9 November 2026" */
export function fmtFullDate(date: Date | number): string {
  return formatter('full', 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

/** "Sunday, 9 November" */
export function fmtLongDate(date: Date): string {
  return formatter('long', 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
}

/** "Sunday" */
export function fmtWeekday(date: Date): string {
  return formatter('weekday', 'en-GB', { weekday: 'long' }).format(date);
}

/** "Sun" */
export function fmtWeekdayShort(date: Date): string {
  return formatter('weekdayShort', 'en-GB', { weekday: 'short' }).format(date);
}

export function fmtDayNumber(date: Date): string {
  return formatter('day', 'en-GB', { day: 'numeric' }).format(date);
}

export function fmtMonthYear(date: Date): string {
  return formatter('monthYear', 'en-GB', { month: 'long', year: 'numeric' }).format(date);
}

/** Umm al-Qura Hijri date, e.g. "28 Jumada I 1448". */
export function hijriDate(date: Date): string {
  try {
    const locale = language() === 'ar' ? 'ar-u-ca-islamic-umalqura-nu-latn' : 'en-US-u-ca-islamic-umalqura';
    const zone = displayZone;
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      ...(zone ? { timeZone: zone } : {}),
    })
      .format(date)
      .replace(/\s*(AH|هـ)$/, '');
  } catch {
    return '';
  }
}

/** "just now", "4 minutes ago" */
export function fmtAgo(then: number, now = Date.now()): string {
  const minutes = Math.round((now - then) / 60000);
  if (minutes < 1) return t('just now');
  if (minutes === 1) return t('a minute ago');
  if (minutes < 60) return t('{n} minutes ago', { n: minutes });
  const hours = Math.round(minutes / 60);
  return hours === 1 ? t('an hour ago') : t('{n} hours ago', { n: hours });
}

export function greeting(date: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      hour12: false,
      ...(displayZone ? { timeZone: displayZone } : {}),
    }).format(date),
  );
  if (hour < 5) return t('Peaceful night');
  if (hour < 12) return t('Good morning');
  if (hour < 17) return t('Good afternoon');
  if (hour < 21) return t('Good evening');
  return t('Peaceful night');
}
