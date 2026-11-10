import { useSyncExternalStore } from 'react';
import { deviceTimeZone } from './format';
import type { JournalEntry } from './journal';
import { dateKey } from './prayer-times';
import type {
  AdaptKey,
  DayLog,
  DeedEntry,
  LogStatus,
  Logs,
  Persisted,
  PrayerKey,
  Profile,
  Recitation,
  Settings,
} from './types';

const STORAGE_KEY = 'niyyah.state.v1';

export const DEFAULT_SETTINGS: Settings = {
  setupComplete: false,
  place: null,
  method: 'MWL',
  madhab: 'shafi',
  highLat: 'auto',
  timeFormat: '12h',
  theme: 'auto',
  reminders: true,
  preAlert: 10,
  sound: true,
  qadaEnabled: true,
  name: '',
  profile: null,
  profileAsked: false,
  calm: false,
  coarseTime: false,
  literal: false,
  tone: 'gentle',
  ladder: false,
  ladderSteps: [20, 10],
  catchup: true,
  learn: false,
  hasanatTab: true,
};

export function defaultState(): Persisted {
  return {
    settings: { ...DEFAULT_SETTINGS },
    logs: {},
    qada: 0,
    dismissed: {},
    deeds: {},
    journal: {},
  };
}

function normalize(input: unknown): Persisted {
  const base = defaultState();
  if (!input || typeof input !== 'object') return base;
  const raw = input as Partial<Persisted> & Record<string, unknown>;
  const settings = (raw.settings ?? {}) as Partial<Settings>;
  const merged: Settings = { ...base.settings, ...settings };
  // Older saves (and hand-entered coordinates) may not carry a timezone yet.
  if (merged.place && !merged.place.timezone) {
    merged.place = { ...merged.place, timezone: deviceTimeZone() };
  }
  return {
    settings: merged,
    logs: raw.logs && typeof raw.logs === 'object' ? (raw.logs as Logs) : {},
    qada: typeof raw.qada === 'number' && Number.isFinite(raw.qada) ? Math.max(0, Math.round(raw.qada)) : 0,
    dismissed: raw.dismissed && typeof raw.dismissed === 'object' ? (raw.dismissed as Record<string, number>) : {},
    deeds: raw.deeds && typeof raw.deeds === 'object' ? (raw.deeds as Record<string, DeedEntry[]>) : {},
    journal: raw.journal && typeof raw.journal === 'object' ? (raw.journal as Record<string, JournalEntry[]>) : {},
  };
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return normalize(JSON.parse(raw));
  } catch {
    return defaultState();
  }
}

let state: Persisted = load();
const listeners = new Set<() => void>();

function persist(next: Persisted) {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can be full or blocked; the app still works for this session.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}

// Keep two windows/tabs in step (e.g. the browser preview and a second window).
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    state = load();
    listeners.forEach((listener) => listener());
  });
}

export function useStore(): Persisted {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function currentState(): Persisted {
  return state;
}

export const actions = {
  updateSettings(patch: Partial<Settings>) {
    persist({ ...state, settings: { ...state.settings, ...patch } });
  },

  finishSetup(patch: Partial<Settings>) {
    persist({ ...state, settings: { ...state.settings, ...patch, setupComplete: true } });
  },

  setStatus(dayKeyValue: string, prayer: PrayerKey, status: LogStatus | null) {
    const day: DayLog = { ...(state.logs[dayKeyValue] ?? {}) };
    const previous = day[prayer];
    let qada = state.qada;

    if (previous?.q && status !== 'missed') qada = Math.max(0, qada - 1);

    if (status === null) {
      delete day[prayer];
    } else {
      const counts = status === 'missed' && state.settings.qadaEnabled;
      if (counts && !previous?.q) qada += 1;
      // Keep jama'ah and recitation details when only the status changes.
      day[prayer] = { ...previous, s: status, at: Date.now(), q: counts || undefined };
    }

    const logs = { ...state.logs };
    if (Object.keys(day).length === 0) delete logs[dayKeyValue];
    else logs[dayKeyValue] = day;

    persist({ ...state, logs, qada });
  },

  /** Update the optional hasanat details (jama'ah, recitation) of a logged prayer. */
  setPrayerDetails(
    dayKeyValue: string,
    prayer: PrayerKey,
    patch: { j?: boolean; r?: Recitation[]; nf?: number[] },
  ) {
    const existing = state.logs[dayKeyValue]?.[prayer];
    if (!existing) return;
    const entry = { ...existing, ...patch };
    if (!entry.j) delete entry.j;
    if (!entry.r?.length) delete entry.r;
    if (!entry.nf?.length) delete entry.nf;
    const logs = { ...state.logs, [dayKeyValue]: { ...state.logs[dayKeyValue], [prayer]: entry } };
    persist({ ...state, logs });
  },

  addDeed(dayKeyValue: string, deed: Omit<DeedEntry, 'id' | 'at'>): string {
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const entry: DeedEntry = { ...deed, id, at: Date.now() };
    const list = [...(state.deeds[dayKeyValue] ?? []), entry];
    persist({ ...state, deeds: { ...state.deeds, [dayKeyValue]: list } });
    return id;
  },

  removeDeed(dayKeyValue: string, id: string) {
    const list = (state.deeds[dayKeyValue] ?? []).filter((deed) => deed.id !== id);
    const deeds = { ...state.deeds };
    if (list.length) deeds[dayKeyValue] = list;
    else delete deeds[dayKeyValue];
    persist({ ...state, deeds });
  },

  /**
   * Change one Comfort & support setting by hand. If onboarding had suggested
   * it, remember that the user chose otherwise so a retake leaves it alone.
   */
  setAdaptation<K extends AdaptKey>(key: K, value: Settings[K]) {
    let profile = state.settings.profile;
    if (profile?.applied.some((item) => item.key === key) && !profile.overridden.includes(key)) {
      profile = { ...profile, overridden: [...profile.overridden, key] };
    }
    persist({ ...state, settings: { ...state.settings, [key]: value, profile } });
  },

  /** Save onboarding answers and apply their suggestions (outside first setup). */
  applyProfile(profile: Profile, patch: Partial<Settings>) {
    persist({ ...state, settings: { ...state.settings, ...patch, profile, profileAsked: true } });
  },

  /** Re-apply every onboarding suggestion, including ones changed by hand. */
  resetToSuggestions(patch: Partial<Settings>) {
    const profile = state.settings.profile;
    if (!profile) return;
    persist({ ...state, settings: { ...state.settings, ...patch, profile: { ...profile, overridden: [] } } });
  },

  /** Forget the answers and reasons; keep every current setting as it is. */
  clearProfile() {
    persist({ ...state, settings: { ...state.settings, profile: null, profileAsked: true } });
  },

  addJournal(dayKeyValue: string, entry: Omit<JournalEntry, 'id' | 'at'>): string {
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const list = [...(state.journal[dayKeyValue] ?? []), { ...entry, id, at: Date.now() }];
    persist({ ...state, journal: { ...state.journal, [dayKeyValue]: list } });
    return id;
  },

  updateJournal(dayKeyValue: string, id: string, patch: Partial<JournalEntry>) {
    const list = (state.journal[dayKeyValue] ?? []).map((entry) => (entry.id === id ? { ...entry, ...patch } : entry));
    persist({ ...state, journal: { ...state.journal, [dayKeyValue]: list } });
  },

  /** Removes an entry and returns it, so the caller can offer Undo. */
  removeJournal(dayKeyValue: string, id: string): JournalEntry | undefined {
    const current = state.journal[dayKeyValue] ?? [];
    const removed = current.find((entry) => entry.id === id);
    const list = current.filter((entry) => entry.id !== id);
    const journal = { ...state.journal };
    if (list.length) journal[dayKeyValue] = list;
    else delete journal[dayKeyValue];
    persist({ ...state, journal });
    return removed;
  },

  /** Put a removed entry back exactly as it was (Undo). */
  restoreJournal(dayKeyValue: string, entry: JournalEntry) {
    const list = [...(state.journal[dayKeyValue] ?? []), entry].sort((a, b) => a.at - b.at);
    persist({ ...state, journal: { ...state.journal, [dayKeyValue]: list } });
  },

  setQada(value: number) {
    persist({ ...state, qada: Math.max(0, Math.round(value)) });
  },

  dismissCatchup(id: string) {
    persist({ ...state, dismissed: { ...state.dismissed, [id]: Date.now() } });
  },

  /** Replace everything (import or reset). */
  replaceAll(next: unknown) {
    persist(normalize(next));
  },

  resetAll() {
    persist(defaultState());
  },
};

export function snapshot(): string {
  return JSON.stringify({ app: 'niyyah', version: 1, exportedAt: new Date().toISOString(), state }, null, 2);
}

export function importSnapshot(text: string): { ok: boolean; error?: string } {
  try {
    const parsed = JSON.parse(text);
    const candidate = parsed?.state ?? parsed;
    if (!candidate || typeof candidate !== 'object' || !candidate.settings) {
      return { ok: false, error: 'That file does not look like a Niyyah backup.' };
    }
    persist(normalize(candidate));
    return { ok: true };
  } catch {
    return { ok: false, error: 'The file could not be read as JSON.' };
  }
}

export function logsFor(logs: Logs, day: Date): DayLog {
  return logs[dateKey(day)] ?? {};
}

export function countWeek(logs: Logs, days: Date[]): { done: number; possible: number } {
  let done = 0;
  let possible = 0;
  for (const day of days) {
    const entry = logs[dateKey(day)] ?? {};
    for (const status of Object.values(entry)) {
      if (!status) continue;
      if (status.s === 'ontime' || status.s === 'late') done += 1;
    }
    possible += 5;
  }
  return { done, possible };
}
