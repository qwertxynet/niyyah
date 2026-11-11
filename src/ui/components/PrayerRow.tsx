import { fmtTime } from '../../domain/format';
import type { Slot } from '../../domain/prayer-times';
import type { LogStatus, TimeFormat } from '../../domain/types';
import { StatusMark, statusText } from './StatusMark';
import { t } from '../../i18n';
import { celebrate } from '../celebrate';

export function PrayerRow({
  slot,
  status,
  loggedAt,
  timeFormat,
  now,
  onOpen,
  onQuickLog,
}: {
  slot: Slot;
  status?: LogStatus;
  /** When it was logged, so a just-logged row can celebrate quietly. */
  loggedAt?: number;
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
        aria-label={t('{name}, {time}, {status}. Open details', {
          name: slot.name,
          time: fmtTime(slot.start, timeFormat),
          status: statusText(status),
        })}
      >
        <span className="row-time tnum">{fmtTime(slot.start, timeFormat)}</span>
        <span className="row-name">
          {slot.name}
          <span className="arabic ar-dup">{slot.arabic}</span>
        </span>
        {isCurrent ? <span className="row-tag">{t('now')}</span> : <span aria-hidden="true" />}
      </button>

      <button
        type="button"
        className="row-action"
        onClick={(event) => {
          if (!status) celebrate(event.currentTarget, { count: 9 });
          onQuickLog();
        }}
        disabled={!started}
        aria-label={
          status
            ? t('{name}: {status}. Change it', { name: slot.name, status: statusText(status) })
            : started
              ? t('Log {name} as prayed', { name: slot.name })
              : t('{name} has not begun yet', { name: slot.name })
        }
      >
        <StatusMark status={status} future={!started} fresh={Boolean(loggedAt && now.getTime() - loggedAt < 2500)} />
      </button>
    </li>
  );
}
