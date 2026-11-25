import { useCallback, useEffect, useState } from 'react';

/** Re-renders on an interval and immediately when the app becomes visible. */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = window.setInterval(tick, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', tick);
    };
  }, [intervalMs]);

  return now;
}

/**
 * A clock that ticks on each new minute (aligned to :00, so "As of 2:21 PM"
 * changes when the phone's clock does), when the app becomes visible, and
 * whenever refresh() is called — e.g. by a countdown reaching zero.
 */
export function useMinuteClock(): [Date, () => void] {
  const [now, setNow] = useState(() => new Date());
  const refresh = useCallback(() => setNow(new Date()), []);

  useEffect(() => {
    let timer = 0;
    const schedule = () => {
      const msToMinute = 60_000 - (Date.now() % 60_000) + 50;
      timer = window.setTimeout(() => {
        refresh();
        schedule();
      }, msToMinute);
    };
    schedule();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refresh);
    };
  }, [refresh]);

  return [now, refresh];
}
