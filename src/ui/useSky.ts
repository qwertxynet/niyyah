import { useEffect } from 'react';
import { mix, paletteFor, skyAt, type SkyState } from '../domain/sky';
import type { Settings } from '../domain/types';
import { useNow } from './useNow';

const CALM_BASE = { light: '#f6f2ea', dark: '#0f1513' };

/**
 * Paints the living sky: sets `data-sky` (the phase) and `data-sky-tone`
 * (light/dark text) on <html>, plus the colours as CSS variables. Refreshes
 * every minute. In low-stimulation mode the sky is one flat, soft tint.
 */
export function useSky(settings: Settings, theme: 'light' | 'dark'): SkyState | null {
  const now = useNow(60_000);
  let sky = settings.setupComplete ? skyAt(now, settings) : null;
  // Development only: ?sky=maghrib previews a phase without waiting for it.
  if (import.meta.env.DEV && sky) {
    const forced = new URLSearchParams(location.search).get('sky') as SkyState['phase'] | null;
    if (forced) sky = { ...sky, phase: forced, t: 0.4, next: forced };
  }
  const key = sky ? `${sky.phase}|${Math.round(sky.t * 200)}|${theme}|${settings.calm}` : `none|${theme}`;

  useEffect(() => {
    const root = document.documentElement;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const props = [
      '--sky-top', '--sky-mid', '--sky-bottom', '--sky-ink', '--sky-ink-2', '--sky-ink-3', '--sky-accent',
      '--sky-pattern', '--sky-pattern-opacity', '--hero-top', '--hero-bottom',
    ];

    if (!sky) {
      delete root.dataset.sky;
      delete root.dataset.skyTone;
      root.removeAttribute('data-stars');
      for (const prop of props) root.style.removeProperty(prop);
      meta?.setAttribute('content', '#0C2E24');
      return;
    }

    const p = paletteFor(sky, theme);
    root.dataset.sky = sky.phase;

    if (settings.calm) {
      // One flat, quiet tint of the phase: readable, no gradient, no stars.
      const flat = mix(CALM_BASE[theme], p.mid, theme === 'dark' ? 0.18 : 0.14);
      root.dataset.skyTone = theme === 'dark' ? 'dark' : 'light';
      root.removeAttribute('data-stars');
      const set: Record<string, string> = {
        '--sky-top': flat, '--sky-mid': flat, '--sky-bottom': flat,
        '--sky-ink': theme === 'dark' ? '#eef4ef' : '#15251f',
        '--sky-ink-2': theme === 'dark' ? '#a9bcb3' : '#4f5f58',
        '--sky-ink-3': theme === 'dark' ? '#7d918a' : '#6d7c75',
        '--sky-accent': theme === 'dark' ? '#e0c088' : '#8a6b2e',
        '--sky-pattern': p.pattern, '--sky-pattern-opacity': '0',
        '--hero-top': p.heroBottom, '--hero-bottom': p.heroBottom,
      };
      for (const [prop, value] of Object.entries(set)) root.style.setProperty(prop, value);
      meta?.setAttribute('content', flat);
      return;
    }

    root.dataset.skyTone = p.tone;
    const set: Record<string, string> = {
      '--sky-top': p.top, '--sky-mid': p.mid, '--sky-bottom': p.bottom,
      '--sky-ink': p.ink, '--sky-ink-2': p.ink2, '--sky-ink-3': p.ink3, '--sky-accent': p.accent,
      '--sky-pattern': p.pattern, '--sky-pattern-opacity': String(p.patternOpacity),
      '--hero-top': p.heroTop, '--hero-bottom': p.heroBottom,
    };
    for (const [prop, value] of Object.entries(set)) root.style.setProperty(prop, value);
    root.toggleAttribute('data-stars', p.stars);
    meta?.setAttribute('content', p.top);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return sky;
}
