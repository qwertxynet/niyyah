import { addDays, dateKey, placeCivilDate } from './prayer-times';
import { fatihaLetters, lettersIn, lettersInJuz, type QuranMeta } from './quran';
import type { LogEntry, Persisted, PrayerKey } from './types';

/*
 * Hasanat estimates. Only Allah knows the reward of any deed; these rules turn
 * a few well-known narrations into a number meant purely as encouragement.
 * Every rule here is listed, with its source, on the "How is this estimated?"
 * sheet, so keep the two in step.
 */

/** "Whoever does a good deed, it is written for him as ten" (Bukhari 6491, Muslim 131). */
export const PER_GOOD_DEED = 10;
/** "Every letter of the Book of Allah is a good deed, and a good deed is ten like it" (Tirmidhi 2910). */
export const PER_LETTER = 10;
/** Prayer in congregation is 27 times better than alone (Bukhari 645, Muslim 650). */
export const JAMAAH_MULTIPLIER = 27;

export const RAKAHS: Record<PrayerKey, number> = { fajr: 2, dhuhr: 4, asr: 4, maghrib: 3, isha: 4 };

export function recitationLetters(entry: LogEntry, meta: QuranMeta | null): number {
  if (!meta || !entry.r) return 0;
  return entry.r.reduce((sum, part) => sum + lettersIn(meta, part.s, part.from, part.to), 0);
}

/** Estimated hasanat for one logged prayer. Missed or unlogged prayers are 0, never negative. */
export function prayerHasanat(entry: LogEntry | undefined, prayer: PrayerKey, meta: QuranMeta | null): number {
  if (!entry || entry.s === 'missed') return 0;
  const skipped = new Set(entry.nf ?? []);
  let fatihas = 0;
  for (let k = 1; k <= RAKAHS[prayer]; k += 1) if (!skipped.has(k)) fatihas += 1;
  const letters = fatihas * fatihaLetters(meta) + recitationLetters(entry, meta);
  const total = PER_GOOD_DEED + letters * PER_LETTER;
  return entry.j ? total * JAMAAH_MULTIPLIER : total;
}

/** Estimate for an n-rak'ah voluntary prayer with al-Fatihah only. */
export function voluntaryPrayerHasanat(rakahs: number, meta: QuranMeta | null): number {
  return PER_GOOD_DEED + rakahs * fatihaLetters(meta) * PER_LETTER;
}

function dayHasanat(state: Persisted, key: string, meta: QuranMeta | null): number {
  const log = state.logs[key] ?? {};
  let total = 0;
  for (const prayer of Object.keys(RAKAHS) as PrayerKey[]) total += prayerHasanat(log[prayer], prayer, meta);
  for (const deed of state.deeds[key] ?? []) total += deed.h;
  return total;
}

export interface Totals {
  today: number;
  week: number;
  all: number;
  todayKey: string;
}

export function hasanatTotals(state: Persisted, now: Date, meta: QuranMeta | null): Totals {
  const today = placeCivilDate(now, state.settings);
  const todayKey = dateKey(today);
  let week = 0;
  for (let i = 0; i < 7; i += 1) week += dayHasanat(state, dateKey(addDays(today, -i)), meta);
  const keys = new Set([...Object.keys(state.logs), ...Object.keys(state.deeds)]);
  let all = 0;
  for (const key of keys) all += dayHasanat(state, key, meta);
  return { today: dayHasanat(state, todayKey, meta), week, all, todayKey };
}

// ---------- good-deed cards ----------

export type Tier = 'quick' | 'short' | 'medium' | 'long';

export const TIERS: { id: Tier; label: string; hint: string }[] = [
  { id: 'quick', label: 'Quick', hint: '1–3 min' },
  { id: 'short', label: 'Short', hint: '≈ 5–10 min' },
  { id: 'medium', label: 'Medium', hint: '≈ 15–20 min' },
  { id: 'long', label: 'Long', hint: '30 min +' },
];

export interface Phase {
  label: string;
  arabic: string;
  count: number;
}

export interface DeedDef {
  id: string;
  tier: Tier;
  title: string;
  arabic: string;
  time: string;
  /** count: tap counter · once: one button · juz / range: pick what was read first. */
  kind: 'count' | 'once' | 'juz' | 'range';
  phases?: Phase[];
  /** Estimated hasanat for doing it once; null while Qur'an data loads. */
  estimate(meta: QuranMeta | null): number | null;
  virtue: string;
  source: string;
}

const quran = (fn: (meta: QuranMeta) => number) => (meta: QuranMeta | null) => (meta ? fn(meta) * PER_LETTER : null);

export const DEEDS: DeedDef[] = [
  {
    id: 'subhanallah-100',
    tier: 'quick',
    title: 'SubhanAllah ×100',
    arabic: 'سُبْحَانَ ٱللَّٰهِ',
    time: '≈ 2 min',
    kind: 'count',
    phases: [{ label: 'SubhanAllah', arabic: 'سُبْحَانَ ٱللَّٰهِ', count: 100 }],
    estimate: () => 1000,
    virtue: 'A hundred glorifications are written as a thousand good deeds, or a thousand sins are removed.',
    source: 'Muslim 2698',
  },
  {
    id: 'tasbih',
    tier: 'quick',
    title: 'Tasbih after prayer',
    arabic: 'سُبْحَانَ ٱللَّٰهِ · ٱلْحَمْدُ لِلَّٰهِ · ٱللَّٰهُ أَكْبَرُ',
    time: '≈ 2 min',
    kind: 'count',
    phases: [
      { label: 'SubhanAllah', arabic: 'سُبْحَانَ ٱللَّٰهِ', count: 33 },
      { label: 'Alhamdulillah', arabic: 'ٱلْحَمْدُ لِلَّٰهِ', count: 33 },
      { label: 'Allahu akbar', arabic: 'ٱللَّٰهُ أَكْبَرُ', count: 34 },
    ],
    estimate: () => 100 * PER_GOOD_DEED,
    virtue: 'Said after each prayer, sins are forgiven even if they are like the foam of the sea.',
    source: 'Muslim 597',
  },
  {
    id: 'ayat-al-kursi',
    tier: 'quick',
    title: 'Ayat al-Kursi',
    arabic: 'آيَةُ ٱلْكُرْسِيِّ',
    time: '≈ 1 min',
    kind: 'once',
    estimate: quran((m) => lettersIn(m, 2, 255, 255)),
    virtue: 'The greatest verse in the Book of Allah.',
    source: 'Muslim 810',
  },
  {
    id: 'ikhlas-3',
    tier: 'quick',
    title: 'Al-Ikhlas ×3',
    arabic: 'سُورَةُ ٱلْإِخْلَاصِ',
    time: '≈ 1 min',
    kind: 'once',
    estimate: quran((m) => 3 * lettersIn(m, 112)),
    virtue: 'Equal to a third of the Qur’an.',
    source: 'Bukhari 5013',
  },
  {
    id: 'salawat-10',
    tier: 'quick',
    title: 'Salawat ×10',
    arabic: 'ٱللَّٰهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ',
    time: '≈ 1 min',
    kind: 'count',
    phases: [{ label: 'Allahumma salli ‘ala Muhammad', arabic: 'ٱللَّٰهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ', count: 10 }],
    estimate: () => 10 * PER_GOOD_DEED,
    virtue: 'For each one, Allah sends ten blessings, writes ten good deeds and removes ten sins.',
    source: 'Muslim 408 · Nasa’i 1297',
  },
  {
    id: 'mulk',
    tier: 'short',
    title: 'Surah al-Mulk',
    arabic: 'سُورَةُ ٱلْمُلْكِ',
    time: '≈ 7 min',
    kind: 'once',
    estimate: quran((m) => lettersIn(m, 67)),
    virtue: 'A surah of thirty verses that intercedes for its reader until he is forgiven.',
    source: 'Tirmidhi 2891',
  },
  {
    id: 'istighfar-100',
    tier: 'short',
    title: 'Istighfar ×100',
    arabic: 'أَسْتَغْفِرُ ٱللَّٰهَ',
    time: '≈ 4 min',
    kind: 'count',
    phases: [{ label: 'Astaghfirullah', arabic: 'أَسْتَغْفِرُ ٱللَّٰهَ', count: 100 }],
    estimate: () => 100 * PER_GOOD_DEED,
    virtue: 'The Prophet ﷺ sought forgiveness a hundred times a day.',
    source: 'Muslim 2702',
  },
  {
    id: 'sunnah-2',
    tier: 'short',
    title: '2 rak‘ah sunnah',
    arabic: 'رَكْعَتَانِ',
    time: '≈ 5 min',
    kind: 'once',
    estimate: (m) => voluntaryPrayerHasanat(2, m),
    virtue: 'Voluntary prayer draws a servant closer until Allah loves him.',
    source: 'Bukhari 6502',
  },
  {
    id: 'kahf',
    tier: 'medium',
    title: 'Surah al-Kahf',
    arabic: 'سُورَةُ ٱلْكَهْفِ',
    time: '≈ 20 min',
    kind: 'once',
    estimate: quran((m) => lettersIn(m, 18)),
    virtue: 'Read on Friday, it is a light between the two Fridays.',
    source: 'al-Hakim 3392',
  },
  {
    id: 'yasin',
    tier: 'medium',
    title: 'Surah Ya-Sin',
    arabic: 'سُورَةُ يس',
    time: '≈ 15 min',
    kind: 'once',
    estimate: quran((m) => lettersIn(m, 36)),
    virtue: 'Every letter of the Qur’an is a good deed, and each good deed is ten like it.',
    source: 'Tirmidhi 2910',
  },
  {
    id: 'duha',
    tier: 'medium',
    title: 'Duha prayer',
    arabic: 'صَلَاةُ ٱلضُّحَىٰ',
    time: '≈ 5–15 min',
    kind: 'once',
    estimate: (m) => voluntaryPrayerHasanat(2, m),
    virtue: 'Two rak‘ahs of Duha suffice for the charity due on every joint of the body.',
    source: 'Muslim 720',
  },
  {
    id: 'juz',
    tier: 'long',
    title: 'One juz’',
    arabic: 'جُزْء',
    time: '≈ 30–45 min',
    kind: 'juz',
    // Card shows an average juz'; the real figure is used once a juz' is picked.
    estimate: quran((m) => Math.round(m.surahs.reduce((sum, s) => sum + s.l.reduce((a, b) => a + b, 0), 0) / 30)),
    virtue: 'Every letter of the Qur’an is a good deed, and each good deed is ten like it.',
    source: 'Tirmidhi 2910',
  },
  {
    id: 'range',
    tier: 'long',
    title: 'Any Qur’an you read',
    arabic: 'تِلَاوَة',
    time: 'Any length',
    kind: 'range',
    estimate: () => null,
    virtue: 'Every letter of the Qur’an is a good deed, and each good deed is ten like it.',
    source: 'Tirmidhi 2910',
  },
];

export function deedById(id: string): DeedDef | undefined {
  return DEEDS.find((deed) => deed.id === id);
}

export function juzHasanat(meta: QuranMeta, juz: number): number {
  return lettersInJuz(meta, juz) * PER_LETTER;
}

export function rangeHasanat(meta: QuranMeta, surah: number, from: number, to: number): number {
  return lettersIn(meta, surah, from, to) * PER_LETTER;
}

const fmt = new Intl.NumberFormat('en-US');
export function fmtHasanat(value: number): string {
  return fmt.format(Math.round(value));
}
