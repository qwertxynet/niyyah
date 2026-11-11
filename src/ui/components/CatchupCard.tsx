import { fmtTime } from '../../domain/format';
import type { Slot } from '../../domain/prayer-times';
import type { TimeFormat } from '../../domain/types';
import { Icon } from './Icons';
import { t } from '../../i18n';

export function CatchupCard({
  slot,
  text,
  timeFormat,
  onYes,
  onNo,
  onSkip,
}: {
  slot: Slot;
  /** Body text in the user's chosen voice; falls back to the gentle default. */
  text?: string;
  timeFormat: TimeFormat;
  onYes: () => void;
  onNo: () => void;
  onSkip: () => void;
}) {
  return (
    <section className="catchup" aria-label={t('Prayer check-in')}>
      <div className="catchup-icon">
        <Icon name="spark" size={18} />
      </div>
      <div className="catchup-body">
        <p className="catchup-title">{t('Did you pray {name}?', { name: slot.name })}</p>
        <p className="catchup-text">
          {text ??
            t('Its window closed at {end}. Either answer is fine — this just keeps your record honest.', {
              end: fmtTime(slot.end, timeFormat),
            })}
        </p>
        <div className="catchup-actions">
          <button type="button" className="btn btn-solid" onClick={onYes}>
            {t('I did')}
          </button>
          <button type="button" className="btn btn-quiet" onClick={onNo}>
            {t('Not today')}
          </button>
          <button type="button" className="btn btn-quiet" onClick={onSkip}>
            {t('Ask later')}
          </button>
        </div>
      </div>
    </section>
  );
}
