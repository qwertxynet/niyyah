import { useEffect, useState } from 'react';
import type { ThemeMode } from '../domain/types';

/**
 * Applies the colour theme and, when asked, low-stimulation mode (`data-calm`).
 * Returns the theme actually in use, so the sky can pick its palette.
 */
export function useTheme(mode: ThemeMode, calm = false): 'light' | 'dark' {
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const next = mode === 'auto' ? (query.matches ? 'dark' : 'light') : mode;
      document.documentElement.dataset.theme = next;
      document.documentElement.style.colorScheme = next;
      setResolved(next);
    };
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, [mode]);

  useEffect(() => {
    if (calm) document.documentElement.dataset.calm = '';
    else delete document.documentElement.dataset.calm;
  }, [calm]);

  return resolved;
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
