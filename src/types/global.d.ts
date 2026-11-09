import type { ReminderEvent } from '../domain/reminders';

export interface ElectronBridge {
  platform: 'electron';
  version: string;
  schedule(events: ReminderEvent[]): Promise<{ scheduled: number }>;
  cancel(): Promise<void>;
  test(): Promise<void>;
  getAutostart(): Promise<boolean>;
  setAutostart(enabled: boolean): Promise<boolean>;
  readiness?(): Promise<{ appVersion: string }>;
}

declare global {
  interface Window {
    niyyah?: ElectronBridge;
  }
}

export {};
