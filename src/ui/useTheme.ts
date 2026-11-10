import { useEffect } from 'react';
import type { ThemeMode } from '../domain/types';

/** Applies the colour theme and, when asked, low-stimulation mode (`data-calm`). */
export function useTheme(mode: ThemeMode, calm = false) {
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const resolved = mode === 'auto' ? (query.matches ? 'dark' : 'light') : mode;
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
    };
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, [mode]);

  useEffect(() => {
    if (calm) document.documentElement.dataset.calm = '';
    else delete document.documentElement.dataset.calm;
  }, [calm]);
}

/** True when the user asked for less motion, here or in the OS. */
export function lowStimulation(): boolean {
  if (typeof document !== 'undefined' && 'calm' in document.documentElement.dataset) return true;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
