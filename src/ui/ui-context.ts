import { createContext, useContext } from 'react';
import type { JournalKind } from '../domain/journal';
import type { PrayerKey } from '../domain/types';

export type GuideTarget = { kind: 'wudu' } | { kind: 'prayer'; prayer: PrayerKey };
export type JournalIntent = { kind: JournalKind; prayer?: PrayerKey };

export interface UiApi {
  openPrayer(dayKey: string, prayer: PrayerKey): void;
  openRecitation(dayKey: string, prayer: PrayerKey): void;
  /** The "about you" questions, over the app. */
  openAboutYou(): void;
  /** A step-by-step guide: wudu, or how to pray a given prayer. */
  openGuide(guide: GuideTarget): void;
  /** Jump to the Journal tab with a kind of entry (and prayer) ready to write. */
  openJournal(intent: JournalIntent): void;
  /** The Qur'an reader, at a surah and ayah, or at the surah list. */
  openReader(target?: { s?: number; from?: number }): void;
  toast(message: string, undo?: () => void): void;
}

export const UiContext = createContext<UiApi>({
  openPrayer: () => undefined,
  openRecitation: () => undefined,
  openAboutYou: () => undefined,
  openGuide: () => undefined,
  openJournal: () => undefined,
  openReader: () => undefined,
  toast: () => undefined,
});

export function useUi(): UiApi {
  return useContext(UiContext);
}
