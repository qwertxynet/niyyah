import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { fmtHasanat, type DeedDef } from '../../domain/hasanat';
import { buzz } from '../useCountUp';
import { Icon } from './Icons';

/**
 * Full-screen dhikr counter: tap anywhere. Big target, haptic tick on every
 * count, a stronger pulse between phases (e.g. 33 → 33 → 34).
 */
export function TapCounter({
  deed,
  estimate,
  onSave,
  onClose,
}: {
  deed: DeedDef;
  estimate: number;
  /** Called with the share of the full estimate actually counted. */
  onSave: (hasanat: number, done: number, total: number) => void;
  onClose: () => void;
}) {
  const phases = deed.phases ?? [];
  const total = phases.reduce((sum, phase) => sum + phase.count, 0);
  const [done, setDone] = useState(0);

  let phaseIndex = 0;
  let before = 0;
  while (phaseIndex < phases.length - 1 && done >= before + phases[phaseIndex].count) {
    before += phases[phaseIndex].count;
    phaseIndex += 1;
  }
  const phase = phases[phaseIndex];
  const inPhase = Math.min(phase.count, done - before);
  const finished = done >= total;
  const earned = Math.round((estimate * done) / Math.max(1, total));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if ((event.key === ' ' || event.key === 'Enter') && !finished) {
        event.preventDefault();
        tap();
      }
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  });

  function tap() {
    // Functional update: fast taps must never read a stale count.
    setDone((current) => {
      if (current >= total) return current;
      const next = current + 1;
      let boundary = 0;
      let crossed = false;
      for (const p of phases) {
        boundary += p.count;
        if (next === boundary) crossed = true;
      }
      buzz(crossed ? [30, 70, 30] : 12);
      return next;
    });
  }

  const r = 118;
  const circumference = 2 * Math.PI * r;
  const progress = inPhase / phase.count;

  // Portal to <body>: the screen's entrance animation would otherwise trap
  // position: fixed inside it.
  return createPortal(
    <div className="tapper" role="dialog" aria-modal="true" aria-label={deed.title}>
      <div className="tapper-top">
        <button type="button" className="tapper-icon" onClick={onClose} aria-label="Close without saving">
          <Icon name="close" size={20} />
        </button>
        <span className="tapper-title">{deed.title}</span>
        <button
          type="button"
          className="tapper-icon"
          onClick={() => setDone((value) => Math.max(0, value - 1))}
          disabled={done === 0}
          aria-label="Undo one"
        >
          <Icon name="minus" size={20} />
        </button>
      </div>

      {finished ? (
        <div className="tapper-done">
          <div className="tapper-arabic">مَا شَاءَ ٱللَّٰهُ</div>
          <p className="tapper-done-title">Complete</p>
          <p className="tapper-done-sub">
            ≈ +{fmtHasanat(estimate)} hasanat
          </p>
          <button type="button" className="btn btn-primary tapper-save" onClick={() => onSave(estimate, done, total)}>
            Save
          </button>
        </div>
      ) : (
        <button type="button" className="tapper-pad" onClick={tap} aria-label={`Count ${phase.label}. ${inPhase} of ${phase.count}`}>
          <svg className="tapper-ring" viewBox="0 0 260 260" aria-hidden="true">
            <circle cx="130" cy="130" r={r} className="tapper-track" />
            <circle
              cx="130"
              cy="130"
              r={r}
              className="tapper-fill"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              transform="rotate(-90 130 130)"
            />
          </svg>
          <span className="tapper-center">
            <span className="tapper-arabic">{phase.arabic}</span>
            <span className="tapper-count tnum">{inPhase}</span>
            <span className="tapper-of tnum">of {phase.count}</span>
          </span>
        </button>
      )}

      <div className="tapper-foot">
        {phases.length > 1 ? (
          <div className="tapper-steps" aria-hidden="true">
            {phases.map((p, index) => (
              <span key={p.label} className={index < phaseIndex || finished ? 'is-done' : index === phaseIndex ? 'is-now' : ''}>
                {p.label}
              </span>
            ))}
          </div>
        ) : null}
        {!finished ? (
          <>
            <p className="tapper-hint">Tap anywhere{done > 0 ? ` · ≈ +${fmtHasanat(earned)} so far` : ''}</p>
            {done > 0 ? (
              <button type="button" className="btn btn-ghost on-dark" onClick={() => onSave(earned, done, total)}>
                Stop and save {done}
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
