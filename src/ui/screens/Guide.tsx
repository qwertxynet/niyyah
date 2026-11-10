import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { GUIDE_NOTE, prayerSteps, wuduSteps } from '../../domain/guides';
import { prayerMeta } from '../../domain/prayer-times';
import { Icon } from '../components/Icons';
import type { GuideTarget } from '../ui-context';

/** One action per page, big buttons, always says where you are. */
export function Guide({ target, onClose }: { target: GuideTarget; onClose: () => void }) {
  const steps = target.kind === 'wudu' ? wuduSteps() : prayerSteps(target.prayer);
  const title = target.kind === 'wudu' ? 'Wudu, step by step' : `How to pray ${prayerMeta(target.prayer).name}`;
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const last = index === steps.length - 1;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') setIndex((i) => Math.min(steps.length - 1, i + 1));
      if (event.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose, steps.length]);

  return createPortal(
    <div className="guide" role="dialog" aria-modal="true" aria-label={title}>
      <div className="guide-top">
        <span className="guide-title">{title}</span>
        <button type="button" className="guide-close" onClick={onClose} aria-label="Close guide">
          <Icon name="close" size={20} />
        </button>
      </div>
      <div className="guide-progress" aria-hidden="true">
        <i style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
      </div>

      <div className="guide-body" key={index} aria-live="polite">
        <p className="guide-section">
          {step.section} · step {index + 1} of {steps.length}
        </p>
        <h2 className="guide-step">{step.title}</h2>
        <p className="guide-text">{step.body}</p>

        {step.arabic || step.translit ? (
          <div className="guide-phrase">
            {step.arabic ? <p className="guide-arabic">{step.arabic}</p> : null}
            {step.translit ? <p className="guide-translit">{step.translit}</p> : null}
            {step.meaning ? <p className="guide-meaning">{step.meaning}</p> : null}
          </div>
        ) : null}

        {step.times ? <p className="guide-times">{step.times === 1 ? 'Once' : `${step.times} times`}</p> : null}

        {index === 0 ? <p className="guide-note">{GUIDE_NOTE}</p> : null}
      </div>

      <div className="guide-foot">
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
        >
          Back
        </button>
        <button
          type="button"
          className="btn btn-solid"
          style={{ flex: 1 }}
          onClick={() => (last ? onClose() : setIndex(index + 1))}
        >
          {last ? 'Done' : 'Next'} {last ? null : <Icon name="arrowRight" size={17} />}
        </button>
      </div>
    </div>,
    document.body,
  );
}
