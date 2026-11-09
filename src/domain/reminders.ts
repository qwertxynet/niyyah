import { fmtTime } from './format';
import { addDays, prayerDay, startOfDay } from './prayer-times';
import type { Settings } from './types';

export interface ReminderEvent {
  id: number;
  /** Epoch milliseconds. */
  at: number;
  title: string;
  body: string;
  kind: 'adhan' | 'prealert';
  silent: boolean;
}

export const SCHEDULE_DAYS = 30;

/**
 * Builds every alarm needed for the next 30 days. Five prayers plus an optional
 * pre-alert is 300 events at most — comfortably under Android's 500-alarm cap.
 */
export function buildReminderEvents(settings: Settings, now = new Date(), days = SCHEDULE_DAYS): ReminderEvent[] {
  if (!settings.place || !settings.reminders) return [];

  const events: ReminderEvent[] = [];
  const midnight = startOfDay(now);
  const preAlertMs = Math.max(0, settings.preAlert) * 60_000;

  for (let index = 0; index < days; index += 1) {
    const day = prayerDay(addDays(midnight, index), settings);
    if (day.degraded) continue;

    day.slots.forEach((slot, slotIndex) => {
      const base = index * 20 + slotIndex * 2;
      const start = slot.start.getTime();

      if (preAlertMs > 0) {
        const preAlertAt = start - preAlertMs;
        if (preAlertAt > now.getTime()) {
          events.push({
            id: base + 1,
            at: preAlertAt,
            kind: 'prealert',
            silent: !settings.sound,
            title: `${slot.name} in ${settings.preAlert} minutes`,
            body: `Adhan at ${fmtTime(slot.start, settings.timeFormat)}. A little warning, no rush.`,
          });
        }
      }

      if (start > now.getTime()) {
        events.push({
          id: base + 2,
          at: start,            kind: 'adhan',
            silent: !settings.sound,
            title: `${slot.name} · ${fmtTime(slot.start, settings.timeFormat)}`,
          body: `It's ${slot.name} time. The window closes at ${fmtTime(slot.end, settings.timeFormat)}.`,
        });
      }
    });
  }

  return events.sort((a, b) => a.at - b.at);
}
