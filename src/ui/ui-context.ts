import { createContext, useContext } from 'react';
import type { PrayerKey } from '../domain/types';

export type GuideTarget = { kind: 'wudu' } | { kind: 'prayer'; prayer: PrayerKey };

export interface UiApi {
  openPrayer(dayKey: string, prayer: PrayerKey): void;
  openRecitation(dayKey: string, prayer: PrayerKey): void;
  /** The "about you" questions, over the app. */
  openAboutYou(): void;
  /** A step-by-step guide: wudu, or how to pray a given prayer. */
  openGuide(guide: GuideTarget): void;
  toast(message: string, undo?: () => void): void;
}

export const UiContext = createContext<UiApi>({
  openPrayer: () => undefined,
  openRecitation: () => undefined,
  openAboutYou: () => undefined,
  openGuide: () => undefined,
  toast: () => undefined,
});

export function useUi(): UiApi {
  return useContext(UiContext);
}
