import { t } from '../i18n';
import type { Settings } from './types';

/*
 * Wording that follows Settings → Comfort & support. Each line has a gentle,
 * encouraging and minimal version, plus a literal one used whenever "Plain
 * wording" is on: direct statements of fact, no idioms, no implied meaning.
 */

type Voice = { gentle: string; encouraging: string; minimal: string; literal: string };

const COPY = {
  heroDueEyebrow: {
    gentle: 'Window closing',
    encouraging: 'Time to pray',
    minimal: 'Now',
    literal: 'Current prayer',
  },
  heroDueSub: {
    gentle: 'left to pray · closes at {end}',
    encouraging: 'left — you’ve got this · closes at {end}',
    minimal: 'left · ends {end}',
    literal: 'remaining. {name} ends at {end}.',
  },
  badgeOpen: { gentle: 'Open now', encouraging: 'Open now', minimal: 'Open', literal: 'Started' },
  badgeSoon: { gentle: 'Soon', encouraging: 'Nearly closing', minimal: 'Soon', literal: 'Under 20 minutes left' },
  heroNextEyebrow: { gentle: 'Next prayer', encouraging: 'Up next', minimal: 'Next', literal: 'Next prayer' },
  heroNextSub: {
    gentle: 'adhan at {start}',
    encouraging: 'adhan at {start} — a fresh start',
    minimal: 'at {start}',
    literal: 'until {name} starts at {start}.',
  },
  catchupText: {
    gentle: 'Its window closed at {end}. Either answer is fine — this just keeps your record honest.',
    encouraging: 'Its window closed at {end}. Log it either way — an honest record helps you grow.',
    minimal: 'Ended {end}.',
    literal: '{name} ended at {end}. Choose the answer that is true.',
  },
  toastPrayed: {
    gentle: '{name} · prayed',
    encouraging: '{name} · prayed. Alhamdulillah!',
    minimal: '{name} logged',
    literal: '{name} is marked as prayed.',
  },
  hasanatSub: {
    gentle: 'Small deeds, done sincerely, add up.',
    encouraging: 'Every good deed counts — keep going!',
    minimal: 'Estimates for your deeds.',
    literal: 'Estimated rewards for your prayers and good deeds.',
  },
  remindPreTitle: {
    gentle: '{name} in {min} minutes',
    encouraging: '{name} in {min} minutes',
    minimal: '{name} · {min} min',
    literal: '{name} starts in {min} minutes',
  },
  remindPreBody: {
    gentle: 'Adhan at {start}. A little warning, no rush.',
    encouraging: 'Adhan at {start}. Get ready — you can do this.',
    minimal: 'Adhan {start}.',
    literal: 'The adhan is at {start}.',
  },
  remindWrapTitle: {
    gentle: 'Start wrapping up · {name} in {min} min',
    encouraging: 'Wrap up · {name} in {min} min',
    minimal: '{name} · {min} min',
    literal: 'Stop your current task. {name} starts in {min} minutes.',
  },
  remindWrapBody: {
    gentle: 'Find a stopping point for what you’re doing. Adhan at {start}.',
    encouraging: 'Finish this bit and save your place. Adhan at {start}.',
    minimal: 'Adhan {start}.',
    literal: 'Save or pause your task now. The adhan is at {start}.',
  },
  remindWuduTitle: {
    gentle: 'Time for wudu · {name} in {min} min',
    encouraging: 'Wudu time · {name} in {min} min',
    minimal: 'Wudu · {min} min',
    literal: 'Make wudu now. {name} starts in {min} minutes.',
  },
  remindWuduBody: {
    gentle: 'A calm few minutes to get ready. Adhan at {start}.',
    encouraging: 'Fresh wudu, fresh start. Adhan at {start}.',
    minimal: 'Adhan {start}.',
    literal: 'Go and make wudu. The adhan is at {start}.',
  },
  remindAdhanTitle: {
    gentle: '{name} · {start}',
    encouraging: '{name} · {start}',
    minimal: '{name}',
    literal: '{name} has started',
  },
  remindAdhanBody: {
    gentle: 'It’s {name} time. The window closes at {end}.',
    encouraging: 'It’s {name} time — the best moment to pray. Window closes at {end}.',
    minimal: 'Until {end}.',
    literal: 'You can pray {name} now until {end}.',
  },
} satisfies Record<string, Voice>;

export type CopyKey = keyof typeof COPY;

export function say(key: CopyKey, settings: Pick<Settings, 'tone' | 'literal'>, vars: Record<string, string | number> = {}): string {
  const voice: Voice = COPY[key];
  const text = t(settings.literal ? voice.literal : voice[settings.tone] ?? voice.gentle);
  return text.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ''));
}
