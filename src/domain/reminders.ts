import { say } from './copy';
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
/** Android keeps at most 500 pending alarms per app; leave headroom for tests. */
const ALARM_BUDGET = 480;
/** The transition ladder never has more than this many steps. */
export const MAX_LADDER_STEPS = 3;

/** The warnings before each adhan: the transition ladder, or the single pre-alert. */
export function warningMinutes(settings: Settings): number[] {
  if (settings.ladder) {
    return [...new Set(settings.ladderSteps.filter((m) => m > 0 && m <= 120))]
      .sort((a, b) => b - a)
      .slice(0, MAX_LADDER_STEPS);
  }
  return settings.preAlert > 0 ? [settings.preAlert] : [];
}

/** How many days ahead fit under the alarm cap with this many events per prayer. */
export function scheduleDays(settings: Settings): number {
  const perDay = 5 * (1 + warningMinutes(settings).length);
  return Math.min(SCHEDULE_DAYS, Math.floor(ALARM_BUDGET / perDay));
}

/**
 * Builds every alarm needed for the coming weeks. With the transition ladder
 * on, each prayer gets staged warnings — wrap up, then wudu — before the adhan.
 * IDs are day × 40 + prayer × 8 + n, so they stay stable across reschedules.
 */
export function buildReminderEvents(settings: Settings, now = new Date(), days = scheduleDays(settings)): ReminderEvent[] {
  if (!settings.place || !settings.reminders) return [];

  const events: ReminderEvent[] = [];
  const midnight = startOfDay(now);
  const steps = warningMinutes(settings);
  const time = (date: Date) => fmtTime(date, settings.timeFormat);

  for (let index = 0; index < days; index += 1) {
    const day = prayerDay(addDays(midnight, index), settings);
    if (day.degraded) continue;

    day.slots.forEach((slot, slotIndex) => {
      const base = index * 40 + slotIndex * 8;
      const start = slot.start.getTime();
      const vars = { name: slot.name, start: time(slot.start), end: time(slot.end) };

      steps.forEach((minutes, stepIndex) => {
        const at = start - minutes * 60_000;
        if (at <= now.getTime()) return;
        const last = stepIndex === steps.length - 1;
        let title: string;
        let body: string;
        if (!settings.ladder) {
          title = say('remindPreTitle', settings, { ...vars, min: minutes });
          body = say('remindPreBody', settings, vars);
        } else if (last && steps.length > 1) {
          title = say('remindWuduTitle', settings, { ...vars, min: minutes });
          body = say('remindWuduBody', settings, vars);
        } else {
          title = say('remindWrapTitle', settings, { ...vars, min: minutes });
          body = say('remindWrapBody', settings, vars);
        }
        events.push({ id: base + 1 + stepIndex, at, kind: 'prealert', silent: !settings.sound, title, body });
      });

      if (start > now.getTime()) {
        events.push({
          id: base + 7,
          at: start,
          kind: 'adhan',
          silent: !settings.sound,
          title: say('remindAdhanTitle', settings, vars),
          body: say('remindAdhanBody', settings, vars),
        });
      }
    });
  }

  return events.sort((a, b) => a.at - b.at);
}
