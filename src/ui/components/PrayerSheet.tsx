import { fmtLongDate, fmtTime } from '../../domain/format';
import { parseDayKey, prayerDay, prayerMeta } from '../../domain/prayer-times';
import { actions, useStore } from '../../domain/store';
import type { LogStatus, PrayerKey } from '../../domain/types';
import { useUi } from '../ui-context';
import { Icon, type IconName } from './Icons';
import { Sheet } from './Sheet';
import { Term } from './Term';
import { t } from '../../i18n';

const CHOICES: { status: LogStatus; title: string; hint: string; icon: IconName }[] = [
  { status: 'ontime', title: 'Prayed', hint: 'Within the window', icon: 'check' },
  { status: 'late', title: 'Prayed late', hint: 'After the window, or made up later', icon: 'clock' },
  { status: 'missed', title: 'Not today', hint: 'No judgement — it just goes on the record', icon: 'dash' },
];

export function PrayerSheet({
  target,
  onClose,
}: {
  target: { dayKey: string; prayer: PrayerKey } | null;
  onClose: () => void;
}) {
  const { settings, logs } = useStore();
  const ui = useUi();

  const meta = target ? prayerMeta(target.prayer) : null;
  const day = target ? prayerDay(parseDayKey(target.dayKey), settings) : null;
  const slot = day?.slots.find((entry) => entry.key === target?.prayer) ?? null;
  const current = target ? logs[target.dayKey]?.[target.prayer] : undefined;

  function choose(status: LogStatus) {
    if (!target) return;
    const previous = current?.s ?? null;
    actions.setStatus(target.dayKey, target.prayer, status);
    ui.toast(
      t(status === 'ontime' ? '{name} · prayed' : status === 'late' ? '{name} · prayed late' : '{name} · not prayed', {
        name: meta?.name ?? '',
      }),
      () => actions.setStatus(target.dayKey, target.prayer, previous),
    );
    onClose();
  }

  function clear() {
    if (!target) return;
    const previous = current;
    actions.setStatus(target.dayKey, target.prayer, null);
    ui.toast(t('{name} cleared', { name: meta?.name ?? '' }), () => {
      if (!previous) return;
      actions.setStatus(target.dayKey, target.prayer, previous.s);
      // Bring back jama'ah and recitation too.
      actions.setPrayerDetails(target.dayKey, target.prayer, { j: previous.j, r: previous.r, nf: previous.nf });
    });
    onClose();
  }

  return (
    <Sheet open={Boolean(target)} onClose={onClose} title={meta ? t('Log {name}', { name: meta.name }) : t('Log prayer')}>
      {meta && slot ? (
        <>
          <div className="sheet-head">
            <h2 className="sheet-title">
              <Term id={target!.prayer}>{meta.name}</Term>
              <span className="arabic ar-dup">{meta.arabic}</span>
            </h2>
          </div>
          <p className="sheet-sub">
            {fmtLongDate(day!.day)} · {fmtTime(slot.start, settings.timeFormat)} –{' '}
            {fmtTime(slot.end, settings.timeFormat)}
          </p>

          <div className="choices">
            {CHOICES.map((choice) => (
              <button
                key={choice.status}
                type="button"
                className="choice"
                aria-pressed={current?.s === choice.status}
                onClick={() => choose(choice.status)}
              >
                <span className={`choice-icon is-${choice.status}`}>
                  <Icon name={choice.icon} size={18} strokeWidth={2.2} />
                </span>
                <span className="choice-text">
                  <b>{t(choice.title)}</b>
                  <span>{t(choice.hint)}</span>
                </span>
              </button>
            ))}
          </div>

          {current && current.s !== 'missed' ? (
            <button
              type="button"
              className="btn btn-quiet btn-block"
              style={{ marginTop: 12 }}
              onClick={() => {
                ui.openRecitation(target!.dayKey, target!.prayer);
                onClose();
              }}
            >
              <Icon name="star" size={16} /> {t('Recitation & jama‘ah (optional)')}
            </button>
          ) : null}

          {current ? (
            <button
              type="button"
              className="btn btn-quiet btn-block"
              style={{ marginTop: 12 }}
              onClick={clear}
            >
              {t('Clear this log')}
            </button>
          ) : null}
        </>
      ) : null}
    </Sheet>
  );
}
