import { fmtTime } from '../../domain/format';
import type { Slot } from '../../domain/prayer-times';
import type { LogStatus, TimeFormat } from '../../domain/types';
import { StatusMark, statusText } from './StatusMark';

export function PrayerRow({
  slot,
  status,
  timeFormat,
  now,
  onOpen,
  onQuickLog,
}: {
  slot: Slot;
  status?: LogStatus;
  timeFormat: TimeFormat;
  now: Date;
  onOpen: () => void;
  onQuickLog: () => void;
}) {
  const started = slot.start.getTime() <= now.getTime();
  const isCurrent = now >= slot.start && now < slot.end;

  return (
    <li
      data-prayer={slot.key}
      className={`row${isCurrent ? ' is-current' : ''}${status ? ' is-logged' : ''}${
        started ? ' is-past' : ''
      }`}
    >
      <button
        type="button"
        className="row-main"
        onClick={onOpen}
        aria-label={`${slot.name}, ${fmtTime(slot.start, timeFormat)}, ${statusText(status)}. Open details`}
      >
        <span className="row-time tnum">{fmtTime(slot.start, timeFormat)}</span>
        <span className="row-name">
          {slot.name}
          <span className="arabic">{slot.arabic}</span>
        </span>
        {isCurrent ? <span className="row-tag">now</span> : <span aria-hidden="true" />}
      </button>

      <button
        type="button"
        className="row-action"
        onClick={onQuickLog}
        disabled={!started}
        aria-label={
          status
            ? `${slot.name} is ${statusText(status).toLowerCase()}. Change it`
            : started
              ? `Log ${slot.name} as prayed`
              : `${slot.name} has not begun yet`
        }
      >
        <StatusMark status={status} future={!started} />
      </button>
    </li>
  );
}
