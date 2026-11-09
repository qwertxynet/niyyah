import { fmtTime } from '../../domain/format';
import type { Slot } from '../../domain/prayer-times';
import type { TimeFormat } from '../../domain/types';
import { Icon } from './Icons';

export function CatchupCard({
  slot,
  timeFormat,
  onYes,
  onNo,
  onSkip,
}: {
  slot: Slot;
  timeFormat: TimeFormat;
  onYes: () => void;
  onNo: () => void;
  onSkip: () => void;
}) {
  return (
    <section className="catchup" aria-label="Prayer check-in">
      <div className="catchup-icon">
        <Icon name="spark" size={18} />
      </div>
      <div className="catchup-body">
        <p className="catchup-title">Did you pray {slot.name}?</p>
        <p className="catchup-text">
          Its window closed at {fmtTime(slot.end, timeFormat)}. Either answer is fine — this just keeps
          your record honest.
        </p>
        <div className="catchup-actions">
          <button type="button" className="btn btn-solid" onClick={onYes}>
            I did
          </button>
          <button type="button" className="btn btn-quiet" onClick={onNo}>
            Not today
          </button>
          <button type="button" className="btn btn-quiet" onClick={onSkip}>
            Ask later
          </button>
        </div>
      </div>
    </section>
  );
}
