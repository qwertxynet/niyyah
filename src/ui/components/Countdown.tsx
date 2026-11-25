import { useEffect, useRef } from 'react';
import { fmtLeft } from '../../domain/prayer-times';
import { useNow } from '../useNow';

/**
 * The only part of Today that ticks every second. The rest of the screen
 * redraws once a minute; when this reaches zero it asks the screen to redraw
 * at once, so the next prayer window appears on time.
 */
export function Countdown({
  target,
  coarse,
  className,
  onDone,
}: {
  target: Date;
  /** Minutes only: redraws every 30 s instead of every second. */
  coarse: boolean;
  className: string;
  onDone: () => void;
}) {
  const now = useNow(coarse ? 30_000 : 1000);
  const ms = target.getTime() - now.getTime();
  const fired = useRef<number | null>(null);

  const finish = () => {
    if (fired.current === target.getTime()) return;
    fired.current = target.getTime();
    onDone();
  };

  useEffect(() => {
    if (ms <= 0) finish();
  });

  // An exact timer too, so the minutes-only mode (30 s ticks) also switches on time.
  useEffect(() => {
    const left = target.getTime() - Date.now();
    if (left <= 0 || left > 2 ** 31 - 1) return;
    const id = window.setTimeout(finish, left + 50);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.getTime()]);

  return (
    <span className={className} role="timer" aria-live="off">
      {fmtLeft(Math.max(0, ms), coarse)}
    </span>
  );
}
