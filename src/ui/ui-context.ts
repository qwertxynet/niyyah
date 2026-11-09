import { createContext, useContext } from 'react';
import type { PrayerKey } from '../domain/types';

export interface UiApi {
  openPrayer(dayKey: string, prayer: PrayerKey): void;
  toast(message: string, undo?: () => void): void;
}

export const UiContext = createContext<UiApi>({
  openPrayer: () => undefined,
  toast: () => undefined,
});

export function useUi(): UiApi {
  return useContext(UiContext);
}
