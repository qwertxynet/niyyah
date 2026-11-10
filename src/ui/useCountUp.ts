import { useEffect, useRef, useState } from 'react';
import { lowStimulation as reducedMotion } from './useTheme';

/**
 * Animates a number toward `target`. Returns the displayed value and whether it
 * just went up (for a shimmer). The first render shows the value as-is.
 */
export function useCountUp(target: number, durationMs = 900): { value: number; rising: boolean } {
  const [value, setValue] = useState(target);
  const [rising, setRising] = useState(false);
  const shown = useRef(target);

  useEffect(() => {
    const from = shown.current;
    if (from === target) return;
    if (reducedMotion() || target < from) {
      shown.current = target;
      setValue(target);
      return;
    }
    setRising(true);
    const start = performance.now();
    let frame = 0;
    const step = (time: number) => {
      const t = Math.min(1, (time - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      const next = Math.round(from + (target - from) * eased);
      shown.current = next;
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(step);
      else window.setTimeout(() => setRising(false), 500);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return { value, rising };
}

export function buzz(pattern: number | number[]) {
  if (reducedMotion()) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* ignore */
  }
}
