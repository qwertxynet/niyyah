import { registerPlugin } from '@capacitor/core';
import { fmtTime } from './format';
import { platform } from './notify';
import { addDays, placeCivilDate, prayerDay } from './prayer-times';
import { t } from '../i18n';
import type { Persisted } from './types';

/**
 * The Android home-screen widget cannot run the prayer engine, so the app hands
 * it a precomputed schedule: every window for the coming weeks with its time
 * already formatted in the place's clock. The widget only has to find "now" in
 * that list and run a countdown, which keeps it correct without the app open.
 */
export const WIDGET_DAYS = 30;

interface WidgetSlot {
  /** Prayer key. */
  k: string;
  /** Display name and Arabic name. */
  n: string;
  a: string;
  /** Window start / exclusive end, epoch ms. */
  s: number;
  e: number;
  /** Start time formatted in the place's clock. */
  t: string;
  /** Logged status for this window, if any. */
  st?: string;
}

interface WidgetDay {
  key: string;
  slots: WidgetSlot[];
}

export interface WidgetPayload {
  v: 1;
  place: string;
  generatedAt: number;
  /** Minutes-only countdown: no ticking seconds. */
  coarse: boolean;
  /** Widget wording in the app's language (Java format strings). */
  labels: Record<string, string>;
  days: WidgetDay[];
}

/** The widget's few words, translated here because the widget itself cannot. */
function widgetLabels(): Record<string, string> {
  return {
    now: t('Now'),
    nextIn: t('{name} in %s'),
    left: t('%s left'),
    under: t('under a minute'),
    hm: t('%d h %02d min'),
    h: t('%d h'),
    m: t('%d min'),
    ontime: t('Prayed'),
    late: t('Prayed late'),
    missed: t('Not today'),
  };
}

interface WidgetBridge {
  update(options: { json: string }): Promise<void>;
}

const Bridge = registerPlugin<WidgetBridge>('NiyyahWidget');

export function buildWidgetPayload(state: Persisted, now = new Date(), days = WIDGET_DAYS): WidgetPayload | null {
  const { settings, logs } = state;
  if (!settings.setupComplete || !settings.place) return null;

  // Start a day back so the overnight Isha window (before today's Fajr) is covered.
  const civil = placeCivilDate(now, settings);
  const out: WidgetDay[] = [];
  for (let index = -1; index < days; index += 1) {
    const day = prayerDay(addDays(civil, index), settings);
    if (day.degraded) continue;
    const dayLogs = logs[day.key] ?? {};
    out.push({
      key: day.key,
      slots: day.slots.map((slot) => ({
        k: slot.key,
        n: slot.name,
        a: slot.arabic,
        s: slot.start.getTime(),
        e: slot.end.getTime(),
        t: fmtTime(slot.start, settings.timeFormat),
        st: dayLogs[slot.key]?.s,
      })),
    });
  }

  return {
    v: 1,
    place: settings.place.label,
    generatedAt: now.getTime(),
    coarse: settings.coarseTime,
    labels: widgetLabels(),
    days: out,
  };
}

let lastJson = '';

/** Empty the home-screen widget; it then shows "Open Niyyah to load prayer times". */
export async function clearWidget(): Promise<void> {
  lastJson = '';
  if (platform !== 'android') return;
  try {
    await Bridge.update({ json: JSON.stringify({ v: 1, place: '', generatedAt: Date.now(), coarse: false, days: [] }) });
  } catch {
    // No widget bridge in this shell.
  }
}

/** Push the schedule to the home-screen widget. A no-op off Android. */
export async function syncWidget(state: Persisted): Promise<void> {
  if (platform !== 'android') return;
  const payload = buildWidgetPayload(state);
  if (!payload) return;
  // generatedAt changes every call; compare without it to skip redundant pushes.
  const json = JSON.stringify(payload);
  const fingerprint = JSON.stringify({ ...payload, generatedAt: 0 });
  if (fingerprint === lastJson) return;
  try {
    await Bridge.update({ json });
    lastJson = fingerprint;
  } catch {
    // An older native shell without the widget bridge: nothing to update.
  }
}
