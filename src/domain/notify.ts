import { Capacitor } from '@capacitor/core';
import { t } from '../i18n';
import type { ReminderEvent } from './reminders';

export type Platform = 'android' | 'windows' | 'web';
export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';
export type ExactState = 'granted' | 'denied' | 'unknown';

export interface Health {
  platform: Platform;
  permission: PermissionState;
  exact: ExactState;
  scheduled: number;
  note?: string;
}

export const platform: Platform = Capacitor.isNativePlatform()
  ? 'android'
  : typeof window !== 'undefined' && window.niyyah?.platform === 'electron'
    ? 'windows'
    : 'web';

export const platformLabel =
  platform === 'android' ? 'Android' : platform === 'windows' ? 'Windows' : 'Browser';

export function permissionLabel(state: PermissionState): string {
  switch (state) {
    case 'granted':
      return t('Allowed');
    case 'denied':
      return t('Blocked');
    case 'unsupported':
      return t('Not available');
    default:
      return t('Not asked yet');
  }
}

let webEvents: ReminderEvent[] = [];
let webTimer: number | null = null;

const FIRED_PREFIX = 'niyyah.fired.';

function alreadyFired(id: number): boolean {
  try {
    return localStorage.getItem(`${FIRED_PREFIX}${id}`) === '1';
  } catch {
    return false;
  }
}

function markFired(id: number) {
  try {
    localStorage.setItem(`${FIRED_PREFIX}${id}`, '1');
  } catch {
    /* ignore */
  }
}

function startWebLoop() {
  if (webTimer !== null || typeof window === 'undefined') return;
  webTimer = window.setInterval(() => {
    const now = Date.now();
    for (const event of webEvents) {
      if (event.at > now || event.at < now - 120_000) continue;
      if (alreadyFired(event.id)) continue;
      markFired(event.id);
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(event.title, {
            body: event.body,
            tag: `niyyah-${event.id}`,
            silent: event.silent,
          });
        } catch {
          /* Some browsers only allow notifications from a service worker. */
        }
      }
    }
  }, 15_000);
}

async function androidModule() {
  return import('@capacitor/local-notifications');
}

export async function ensurePermission(): Promise<PermissionState> {
  if (platform === 'android') {
    try {
      const { LocalNotifications } = await androidModule();
      let status = await LocalNotifications.checkPermissions();
      if (status.display !== 'granted') status = await LocalNotifications.requestPermissions();
      return status.display === 'granted' ? 'granted' : 'denied';
    } catch {
      return 'unsupported';
    }
  }

  if (platform === 'windows') return 'granted';

  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  const result = await Notification.requestPermission();
  return result === 'granted' ? 'granted' : result === 'denied' ? 'denied' : 'prompt';
}

export async function readPermission(): Promise<PermissionState> {
  if (platform === 'android') {
    try {
      const { LocalNotifications } = await androidModule();
      const status = await LocalNotifications.checkPermissions();
      return status.display === 'granted' ? 'granted' : status.display === 'denied' ? 'denied' : 'prompt';
    } catch {
      return 'unsupported';
    }
  }
  if (platform === 'windows') return 'granted';
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission === 'granted'
    ? 'granted'
    : Notification.permission === 'denied'
      ? 'denied'
      : 'prompt';
}

export async function readExactState(): Promise<ExactState> {
  if (platform !== 'android') return 'unknown';
  try {
    const { LocalNotifications } = await androidModule();
    const check = (LocalNotifications as unknown as {
      checkExactNotificationSetting?: () => Promise<{ exact_alarm: string }>;
    }).checkExactNotificationSetting;
    if (!check) return 'unknown';
    const result = await check();
    return result.exact_alarm === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'unknown';
  }
}

/** Replace the pending schedule with a fresh one. Safe to call on every launch. */
export async function syncSchedule(events: ReminderEvent[]): Promise<Health> {
  if (platform === 'android') {
    try {
      const { LocalNotifications } = await androidModule();

      await LocalNotifications.createChannel({
        id: 'prayer',
        name: t('Prayer times'),
        description: t('Adhan and pre-alerts'),
        importance: 5,
        vibration: true,
      }).catch(() => undefined);

      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({
          notifications: pending.notifications.map((item) => ({ id: item.id })),
        });
      }

      const exact = await readExactState();
      let note: string | undefined;

      try {
        await LocalNotifications.schedule({
          notifications: events.map((event) => ({
            id: event.id,
            title: event.title,
            body: event.body,
            channelId: 'prayer',
            silent: event.silent,
            schedule: { at: new Date(event.at), allowWhileIdle: true },
          })),
        });
      } catch (error) {
        note = error instanceof Error ? error.message : 'Scheduling failed';
      }

      const after = await LocalNotifications.getPending();
      return {
        platform,
        permission: await readPermission(),
        exact,
        scheduled: after.notifications.length,
        note,
      };
    } catch (error) {
      return {
        platform,
        permission: 'unsupported',
        exact: 'unknown',
        scheduled: 0,
        note: error instanceof Error ? error.message : 'Local notifications unavailable',
      };
    }
  }

  if (platform === 'windows') {
    try {
      const result = await window.niyyah?.schedule(events);
      return {
        platform,
        permission: 'granted',
        exact: 'unknown',
        scheduled: result?.scheduled ?? events.length,
      };
    } catch (error) {
      return {
        platform,
        permission: 'granted',
        exact: 'unknown',
        scheduled: 0,
        note: error instanceof Error ? error.message : 'Could not reach the desktop shell',
      };
    }
  }

  webEvents = events;
  startWebLoop();
  return {
    platform,
    permission: await readPermission(),
    exact: 'unknown',
    scheduled: events.length,
  };
}

export async function sendTestNotification(): Promise<{ ok: boolean; message: string }> {
  const at = new Date(Date.now() + 4000);

  if (platform === 'android') {
    try {
      const { LocalNotifications } = await androidModule();
      const permission = await ensurePermission();
      if (permission !== 'granted') return { ok: false, message: 'Notifications are blocked for Niyyah.' };
      await LocalNotifications.schedule({
        notifications: [
          {
            id: 9001,
            title: t('Niyyah test'),
            body: t('This is what a prayer reminder will look like.'),
            channelId: 'prayer',
            schedule: { at, allowWhileIdle: true },
          },
        ],
      });
      return { ok: true, message: 'Sent — it should appear in about 4 seconds.' };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'Could not send a test notification.' };
    }
  }

  if (platform === 'windows') {
    try {
      await window.niyyah?.test();
      return { ok: true, message: 'Sent — check the corner of your screen.' };
    } catch {
      return { ok: false, message: 'The desktop shell did not respond.' };
    }
  }

  const permission = await ensurePermission();
  if (permission !== 'granted') return { ok: false, message: 'Your browser has notifications blocked for this site.' };
  try {
    new Notification(t('Niyyah test'), { body: t('This is what a prayer reminder will look like.') });
    return { ok: true, message: 'Sent. Browser notifications only arrive while Niyyah is open.' };
  } catch {
    return { ok: false, message: 'The browser refused to show a notification.' };
  }
}
