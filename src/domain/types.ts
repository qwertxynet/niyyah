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
}

export interface LogEntry {
  s: LogStatus;
  /** When it was recorded, used for gentle "just now" copy and undo. */
  at: number;
  /** True when this entry was added to the make-up counter. */
  q?: boolean;
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
}
