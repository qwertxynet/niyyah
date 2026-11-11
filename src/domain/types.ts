import type { JournalEntry } from './journal';
import type { HifzState } from './hifz';
import type { GapMode } from './player';
import type { ReciterId } from './reciters';

export const PRAYER_KEYS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

export type PrayerKey = (typeof PRAYER_KEYS)[number];

/** How a logged prayer was performed. Absence of a log means "not recorded". */
export type LogStatus = 'ontime' | 'late' | 'missed';

export type MadhabKey = 'shafi' | 'hanafi';

export type TimeFormat = '12h' | '24h';

export type ThemeMode = 'auto' | 'light' | 'dark';

/** High-latitude adjustment. 'auto' leaves the method's own default in place. */
export type HighLatKey = 'auto' | 'middle' | 'seventh' | 'angle';

export type MethodKey =
  | 'MWL'
  | 'ISNA'
  | 'Egyptian'
  | 'Karachi'
  | 'UmmAlQura'
  | 'Dubai'
  | 'Kuwait'
  | 'Qatar'
  | 'Singapore'
  | 'Turkey'
  | 'Tehran'
  | 'MoonsightingCommittee';

export interface Place {
  lat: number;
  lng: number;
  label: string;
  source: 'gps' | 'search' | 'manual';
  /** IANA zone, e.g. "Europe/London". Times are shown in the place's own clock. */
  timezone: string;
}

/** How someone relates to Islam right now (onboarding question 1). */
export type FaithKey = 'new' | 'returning' | 'practising' | 'learning' | 'unsaid';
/** Self-identified neurotype (onboarding question 2). Autistic + ADHD = AuDHD. */
export type NeuroKey = 'autistic' | 'adhd' | 'neurotypical' | 'unsure' | 'unsaid';
/** What gets in the way (onboarding question 3). */
export type NeedKey =
  | 'time'
  | 'forgetting'
  | 'transitions'
  | 'starting'
  | 'sensory'
  | 'vague'
  | 'countdown'
  | 'guilt'
  | 'howto';
export type ToneKey = 'gentle' | 'encouraging' | 'minimal';

/** Settings that onboarding may change. Each is an ordinary, reversible setting. */
export type AdaptKey = 'calm' | 'coarseTime' | 'literal' | 'tone' | 'ladder' | 'catchup' | 'sound' | 'learn' | 'hasanatTab';

export interface Applied {
  key: AdaptKey;
  value: boolean | ToneKey;
  /** The answers that led here, in the user's own words. Empty = standard setting. */
  because: string[];
}

export interface Profile {
  faith: FaithKey | null;
  neuro: NeuroKey[];
  needs: NeedKey[];
  at: number;
  /** What onboarding suggested, and why. */
  applied: Applied[];
  /** Adaptations the user has since changed by hand; retakes leave these alone. */
  overridden: AdaptKey[];
}

export interface Settings {
  setupComplete: boolean;
  place: Place | null;
  method: MethodKey;
  madhab: MadhabKey;
  highLat: HighLatKey;
  timeFormat: TimeFormat;
  theme: ThemeMode;
  reminders: boolean;
  /** Minutes before the adhan for the "closing in" nudge. 0 disables it. */
  preAlert: number;
  sound: boolean;
  /** Show the make-up (qada) panel and add missed prayers to it. */
  qadaEnabled: boolean;

  /** What to call the user. Optional; empty means no name is used. */
  name: string;

  // ---- Comfort & support (set by onboarding, always reversible) ----
  /** Answers to the "about you" questions; null until answered. */
  profile: Profile | null;
  /** The one-time "help Niyyah fit you" card was answered or dismissed. */
  profileAsked: boolean;
  /** Low-stimulation: no motion, glow, pattern or vibration. */
  calm: boolean;
  /** Countdowns in whole minutes, never ticking seconds. */
  coarseTime: boolean;
  /** Plain, literal wording everywhere. */
  literal: boolean;
  tone: ToneKey;
  /** Staged warnings before each prayer instead of a single pre-alert. */
  ladder: boolean;
  /** Minutes before the adhan for each ladder step, largest first. */
  ladderSteps: number[];
  /** "Did you pray …?" check-in after a window closes. */
  catchup: boolean;
  /** Explain terms and offer step-by-step guides. */
  learn: boolean;
  hasanatTab: boolean;

  /** Interface language. Arabic also turns the layout right-to-left. */
  language: 'en' | 'ar';
  /** Qur'an reader text size, 1 (small) to 5 (largest). */
  quranSize: number;
  /** Qur'an reader shows one ayah at a time. */
  quranFocus: boolean;

  // ---- recitation audio ----
  reciter: ReciterId;
  /** Playback speed: 0.75, 1 or 1.25. */
  audioRate: number;
  /** Times each ayah plays before moving on. */
  audioRepeat: number;
  /** Pause after each ayah, for reciting it back. */
  audioGap: GapMode;
}

export interface LogEntry {
  s: LogStatus;
  /** When it was recorded, used for gentle "just now" copy and undo. */
  at: number;
  /** True when this entry was added to the make-up counter. */
  q?: boolean;
  /** Prayed in congregation (jama'ah). */
  j?: boolean;
  /** Optional recitation beyond al-Fatihah, per rak'ah (k is 1-based). */
  r?: Recitation[];
  /** Rak'ahs where al-Fatihah should not be counted (it is by default). */
  nf?: number[];
}

export interface Recitation {
  /** Rak'ah, 1-based. */
  k: number;
  /** Surah number. */
  s: number;
  from: number;
  to: number;
}

/** A good deed done outside the five prayers. */
export interface DeedEntry {
  id: string;
  /** Which card it came from (see src/domain/hasanat.ts). */
  rule: string;
  /** Short description, e.g. "Juz' 30" or "Surah al-Mulk". */
  label: string;
  /** Estimated hasanat at the time it was recorded. */
  h: number;
  at: number;
  /** For Qur'an read in the reader: the surah and ayahs. */
  q?: { s: number; from: number; to: number };
}

/** Where the reader left off: the last ayah saved as read. */
export interface ReadingMark {
  s: number;
  a: number;
  at: number;
}

export type DayLog = Partial<Record<PrayerKey, LogEntry>>;
export type Logs = Record<string, DayLog>;

export interface Persisted {
  settings: Settings;
  logs: Logs;
  /** How many prayers the user has set aside to make up. */
  qada: number;
  /** Catch-up cards the user asked to skip, keyed "dayKey:prayer". */
  dismissed: Record<string, number>;
  /** Good deeds by prayer-day key. */
  deeds: Record<string, DeedEntry[]>;
  /** Journal entries by prayer-day key. Never leaves the device except in a backup you export. */
  journal: Record<string, JournalEntry[]>;
  /** Qur'an reader bookmark; null until something is read. */
  reading: ReadingMark | null;
  /** Memorisation plan and progress per ayah. */
  hifz: HifzState;
}
