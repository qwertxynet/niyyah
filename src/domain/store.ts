import { useSyncExternalStore } from 'react';
import { deviceTimeZone } from './format';
import { dateKey } from './prayer-times';
import type { DayLog, LogStatus, Logs, Persisted, PrayerKey, Settings } from './types';

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
};

export function defaultState(): Persisted {
  return {
    settings: { ...DEFAULT_SETTINGS },
    logs: {},
    qada: 0,
    dismissed: {},
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
      day[prayer] = { s: status, at: Date.now(), q: counts || undefined };
    }

    const logs = { ...state.logs };
    if (Object.keys(day).length === 0) delete logs[dayKeyValue];
    else logs[dayKeyValue] = day;

    persist({ ...state, logs, qada });
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
