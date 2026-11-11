import { t } from '../i18n';
import type { PrayerKey } from './types';

/*
 * Journal prompts. Each kind has a small bank; the day's prompt is picked by
 * date so it stays the same all day (predictable), with a "different prompt"
 * button for when it doesn't land. Prompts are plain and concrete — a blank
 * page is the hardest way to start.
 */

export type JournalKind = 'checkin' | 'reflection' | 'gratitude' | 'dua' | 'intention';
export type MoodKey = 'heavy' | 'low' | 'okay' | 'good' | 'light';
export type EnergyKey = 'empty' | 'low' | 'some' | 'plenty';

export interface JournalEntry {
  id: string;
  at: number;
  kind: JournalKind;
  /** The prompt shown when it was written. */
  prompt: string;
  text: string;
  /** Gratitude: up to three short lines. */
  items?: string[];
  mood?: MoodKey;
  energy?: EnergyKey;
  /** After-prayer reflections: which prayer. */
  prayer?: PrayerKey;
  /** Duas: when it was marked answered. */
  answered?: number;
}

export const KINDS: { id: JournalKind; label: string; arabic: string; hint: string }[] = [
  { id: 'checkin', label: 'Check-in', arabic: 'حَال', hint: 'How you are, in two taps' },
  { id: 'reflection', label: 'Reflection', arabic: 'تَفَكُّر', hint: 'A few words after praying' },
  { id: 'gratitude', label: 'Gratitude', arabic: 'شُكْر', hint: 'Three things, big or small' },
  { id: 'dua', label: 'Dua', arabic: 'دُعَاء', hint: 'What you are asking for' },
  { id: 'intention', label: 'Intention', arabic: 'نِيَّة', hint: 'One niyyah for tomorrow' },
];

export const MOODS: { id: MoodKey; label: string; face: string }[] = [
  { id: 'heavy', label: 'Heavy', face: '😞' },
  { id: 'low', label: 'Low', face: '😕' },
  { id: 'okay', label: 'Okay', face: '😐' },
  { id: 'good', label: 'Good', face: '🙂' },
  { id: 'light', label: 'Light', face: '😊' },
];

export const ENERGY: { id: EnergyKey; label: string }[] = [
  { id: 'empty', label: 'Empty' },
  { id: 'low', label: 'Low' },
  { id: 'some', label: 'Some' },
  { id: 'plenty', label: 'Plenty' },
];

const PROMPTS: Record<JournalKind, string[]> = {
  checkin: [
    'What is taking up the most space in your head right now?',
    'What would make the rest of today 10% easier?',
    'What did your body need today that it did or didn’t get?',
    'What is one thing you can let go of for today?',
    'Which prayer felt easiest today, and why?',
    'What is one small win from today, even a tiny one?',
  ],
  reflection: [
    'One thing you asked Allah for in {prayer}?',
    'What were you thinking about during {prayer}? No judgement — just notice.',
    'Was there a moment in {prayer} that felt present? What helped?',
    'What made it hard or easy to start {prayer}?',
    'One word for how {prayer} felt.',
    'Is there anything you want to carry from {prayer} into the next hour?',
  ],
  gratitude: [
    'Three things you are grateful to Allah for today.',
    'Three people or moments that were kind to you this week.',
    'Three small comforts you noticed today.',
    'Three things your body let you do today.',
    'Three things that went better than you expected.',
  ],
  dua: [
    'What are you asking Allah for right now?',
    'A dua for someone you love.',
    'Something you want help with that feels too small to mention — mention it.',
    'A dua for the version of you a year from now.',
  ],
  intention: [
    'One niyyah for tomorrow. Keep it small enough to actually do.',
    'Which prayer tomorrow do you want to give a little more care?',
    'What is one thing you will do tomorrow purely for Allah?',
    'What will you do first after Fajr tomorrow?',
  ],
};

function dayNumber(dayKey: string): number {
  const [y, m, d] = dayKey.split('-').map(Number);
  return Math.floor(Date.UTC(y, (m || 1) - 1, d || 1) / 86_400_000);
}

/** The prompt for this kind on this day; `shift` cycles through alternatives. */
export function promptFor(kind: JournalKind, dayKey: string, shift = 0, prayerName?: string): string {
  const bank = PROMPTS[kind];
  const index = (((dayNumber(dayKey) + shift) % bank.length) + bank.length) % bank.length;
  return t(bank[index]).replace(/\{prayer\}/g, prayerName ?? t('your last prayer'));
}

/** A kind's label and hint in the interface language. */
export function kindMeta(kind: JournalKind) {
  const entry = KINDS.find((item) => item.id === kind) ?? KINDS[0];
  return { ...entry, label: t(entry.label), hint: t(entry.hint) };
}

/** A short, flat summary of an entry for lists and screen readers. */
export function entrySummary(entry: JournalEntry): string {
  if (entry.kind === 'gratitude' && entry.items?.length) return entry.items.filter(Boolean).join(' · ');
  return entry.text;
}
