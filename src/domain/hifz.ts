/*
 * Memorisation (hifz) scheduling. Pure functions over plain data, so the same
 * answers always give the same schedule.
 *
 * Each memorised ayah has an interval in days. Reciting it from memory and
 * rating it moves the interval: "Smooth" grows it, "A few slips" grows it a
 * little, "Needed help" brings it back to tomorrow. Nothing ever resets for a
 * missed day — ayahs simply wait — and the daily list is capped so a break
 * never comes back as a wall of work.
 *
 * The three traditional groups are labels on the same data:
 *   sabaq  — new today
 *   sabqi  — recent: interval under a week
 *   manzil — long-term: a week or more
 */

export type Rating = 'smooth' | 'slips' | 'help';
export type Group = 'sabaq' | 'sabqi' | 'manzil';

export interface HifzAyah {
  /** Days until the next review. */
  interval: number;
  /** How quickly the interval grows (1.3–3). */
  ease: number;
  /** Day key ("2026-11-10") the ayah is next due. */
  due: string;
  reps: number;
  lapses: number;
  /** Day key it was first learned. */
  learned: string;
  last: string;
}

export interface HifzPlan {
  /** Surahs to memorise, in the order to learn them (e.g. Juz 30 from an-Nas back). */
  surahs: number[];
  /** New ayahs offered per day. */
  newPerDay: number;
}

export interface HifzState {
  plan: HifzPlan | null;
  ayahs: Record<string, HifzAyah>;
}

export const EMPTY_HIFZ: HifzState = { plan: null, ayahs: {} };

export const MAX_REVIEWS = 10;
export const MAX_INTERVAL = 60;
const MIN_EASE = 1.3;
const MAX_EASE = 3;

export const ayahKey = (s: number, a: number) => `${s}:${a}`;

export function parseKey(key: string): { s: number; a: number } {
  const [s, a] = key.split(':').map(Number);
  return { s, a };
}

export function addDaysKey(dayKey: string, days: number): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  const ms = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((ms(to) - ms(from)) / 86_400_000);
}

export function groupOf(item: HifzAyah | undefined, today: string): Group | null {
  if (!item) return null;
  if (item.learned === today && item.reps <= 1) return 'sabaq';
  return item.interval < 7 ? 'sabqi' : 'manzil';
}

/** A first pass through a new ayah: it comes back tomorrow. */
export function learn(today: string, rating: Rating): HifzAyah {
  const ease = rating === 'smooth' ? 2.5 : rating === 'slips' ? 2.3 : 2.1;
  return { interval: 1, ease, due: addDaysKey(today, 1), reps: 1, lapses: 0, learned: today, last: today };
}

/** A review, rated after reciting from memory. */
export function review(item: HifzAyah, today: string, rating: Rating): HifzAyah {
  let { interval, ease, lapses } = item;
  if (rating === 'smooth') {
    // Recalled after a longer gap than planned? Credit the real gap.
    const real = Math.max(interval, daysBetween(item.last, today));
    interval = Math.max(interval + 1, Math.round(real * ease));
    ease = Math.min(MAX_EASE, ease + 0.05);
  } else if (rating === 'slips') {
    interval = Math.max(1, Math.round(interval * 1.2));
  } else {
    interval = 1;
    ease = Math.max(MIN_EASE, ease - 0.2);
    lapses += 1;
  }
  interval = Math.min(MAX_INTERVAL, interval);
  return { ...item, interval, ease, lapses, reps: item.reps + 1, due: addDaysKey(today, interval), last: today };
}

/** Rate one ayah: learns it if new, reviews it otherwise. */
export function rate(state: HifzState, s: number, a: number, today: string, rating: Rating): HifzState {
  const key = ayahKey(s, a);
  const existing = state.ayahs[key];
  const next = existing ? review(existing, today, rating) : learn(today, rating);
  return { ...state, ayahs: { ...state.ayahs, [key]: next } };
}

/** The plan's ayahs in learning order: surah by surah, each from its first ayah. */
export function planOrder(plan: HifzPlan, ayahCount: (s: number) => number): { s: number; a: number }[] {
  const out: { s: number; a: number }[] = [];
  for (const s of plan.surahs) for (let a = 1; a <= ayahCount(s); a += 1) out.push({ s, a });
  return out;
}

export interface TodayQueue {
  reviews: { s: number; a: number; group: Group }[];
  fresh: { s: number; a: number }[];
  /** Due reviews not shown today because of the cap — they wait, nothing is lost. */
  waiting: number;
  /** Ayahs in the plan already learned at least once. */
  learnedInPlan: number;
  planSize: number;
}

/**
 * Today's work: due reviews (most overdue first, then in mushaf order), capped,
 * plus the next new ayahs from the plan. Reviews already done today don't
 * come back; new ayahs already learned today count toward the day's quota.
 */
export function todayQueue(
  state: HifzState,
  today: string,
  ayahCount: (s: number) => number,
  maxReviews = MAX_REVIEWS,
): TodayQueue {
  const due = Object.entries(state.ayahs)
    .filter(([, item]) => item.due <= today && item.last !== today)
    .sort(([ka, a], [kb, b]) => {
      if (a.due !== b.due) return a.due < b.due ? -1 : 1;
      const pa = parseKey(ka);
      const pb = parseKey(kb);
      return pa.s - pb.s || pa.a - pb.a;
    });
  const reviews = due.slice(0, maxReviews).map(([key, item]) => ({
    ...parseKey(key),
    group: (item.interval < 7 ? 'sabqi' : 'manzil') as Group,
  }));

  const plan = state.plan;
  let fresh: { s: number; a: number }[] = [];
  let learnedInPlan = 0;
  let planSize = 0;
  if (plan) {
    const order = planOrder(plan, ayahCount);
    planSize = order.length;
    learnedInPlan = order.filter(({ s, a }) => state.ayahs[ayahKey(s, a)]).length;
    const learnedToday = order.filter(({ s, a }) => state.ayahs[ayahKey(s, a)]?.learned === today).length;
    const quota = Math.max(0, plan.newPerDay - learnedToday);
    fresh = order.filter(({ s, a }) => !state.ayahs[ayahKey(s, a)]).slice(0, quota);
  }

  return { reviews, fresh, waiting: Math.max(0, due.length - reviews.length), learnedInPlan, planSize };
}

/** Rough minutes for a session: about two minutes per new ayah, half a minute per review. */
export function sessionMinutes(queue: TodayQueue): number {
  return Math.max(1, Math.round(queue.fresh.length * 2 + queue.reviews.length * 0.5));
}

export function normalizeHifz(input: unknown): HifzState {
  if (!input || typeof input !== 'object') return { plan: null, ayahs: {} };
  const raw = input as Partial<HifzState>;
  const candidate = raw.plan as Partial<HifzPlan> | null | undefined;
  const plan =
    candidate && Array.isArray(candidate.surahs) && candidate.surahs.every((n) => Number.isInteger(n) && n >= 1 && n <= 114)
      ? { surahs: candidate.surahs, newPerDay: Math.min(10, Math.max(1, Number(candidate.newPerDay) || 2)) }
      : null;
  const ayahs: Record<string, HifzAyah> = {};
  if (raw.ayahs && typeof raw.ayahs === 'object') {
    for (const [key, item] of Object.entries(raw.ayahs)) {
      if (/^\d+:\d+$/.test(key) && item && typeof item.due === 'string' && Number.isFinite(item.interval)) ayahs[key] = item;
    }
  }
  return { plan, ayahs };
}

/**
 * The words of an ayah for the fade step. Display only: the verified text is
 * split on spaces and nothing is rewritten. Level 1 hides every third word,
 * level 2 shows each word's first letter (with its marks), level 3 hides all.
 */
export function fadeWords(text: string, level: 0 | 1 | 2 | 3): { word: string; hidden: boolean; hint: string }[] {
  const words = text.split(' ').filter(Boolean);
  return words.map((word, index) => {
    // First letter plus the combining marks that follow it.
    const match = /^[^ً-ٰٟۖ-ۭ]?[ً-ٰٟۖ-ۭ]*/u.exec(word);
    const hint = match?.[0] || word.slice(0, 1);
    const hidden = level === 3 || level === 2 || (level === 1 && index % 3 === 2);
    return { word, hidden, hint: level === 2 ? hint : '' };
  });
}
