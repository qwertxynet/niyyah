import { AR } from './ar';

/**
 * The app's languages. English strings are the keys: `t('Settings')` returns
 * the Arabic for "Settings" when Arabic is on, and the English otherwise, so a
 * string that has not been translated yet still reads correctly.
 *
 * App calls setLanguage() on every render from settings (like the display time
 * zone), so plain functions — not only components — can call t().
 */
export type Lang = 'en' | 'ar';

let current: Lang = 'en';

export function setLanguage(lang: Lang) {
  current = lang;
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    if (root.lang !== lang) root.lang = lang;
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    if (root.dir !== dir) root.dir = dir;
  }
}

export function language(): Lang {
  return current;
}

export const isArabic = () => current === 'ar';

/** Untranslated strings seen while running in Arabic, for `window.__niyyahMissing` in development. */
const missing = new Set<string>();

type Vars = Record<string, string | number>;

function fill(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, key: string) => (key in vars ? String(vars[key]) : whole));
}

export function t(en: string, vars?: Vars): string {
  if (current === 'en') return fill(en, vars);
  const ar = AR[en];
  if (ar === undefined && import.meta.env.DEV) {
    missing.add(en);
    (window as unknown as { __niyyahMissing?: string[] }).__niyyahMissing = [...missing];
  }
  return fill(ar ?? en, vars);
}

/**
 * Counted phrases. Arabic has dual and plural forms, so each language gives its
 * own rule: `plural(n, { one: '{n} minute', other: '{n} minutes' })`. Arabic
 * forms come from the dictionary under the key `one|other` (e.g.
 * "{n} minute|{n} minutes"), written as "zero|one|two|few|many|other".
 */
export function plural(n: number, forms: { one: string; other: string }): string {
  if (current === 'en') return fill(n === 1 ? forms.one : forms.other, { n });
  const key = `${forms.one}|${forms.other}`;
  const ar = AR[key];
  if (!ar) {
    if (import.meta.env.DEV) missing.add(key);
    return fill(n === 1 ? forms.one : forms.other, { n });
  }
  const [zero, one, two, few, many, other] = ar.split('|');
  const rule = new Intl.PluralRules('ar').select(n);
  const pick = { zero, one, two, few, many, other }[rule] ?? other;
  return fill(pick || other, { n });
}

/** Locale for Intl formatters. Arabic keeps Western digits, matching times and countdowns. */
export function intlLocale(base: 'en-US' | 'en-GB'): string {
  return current === 'ar' ? 'ar-u-nu-latn' : base;
}
