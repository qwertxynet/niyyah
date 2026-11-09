import { Icon } from '../components/Icons';
import { statusText } from '../components/StatusMark';
import { fmtDayNumber, fmtWeekdayShort } from '../../domain/format';
import { addDays, dateKey, placeCivilDate, prayerDay, PRAYERS } from '../../domain/prayer-times';
import { useStore } from '../../domain/store';
import type { LogStatus } from '../../domain/types';
import { useNow } from '../useNow';
import { useUi } from '../ui-context';

function cellClass(status: LogStatus | undefined, future: boolean): string {
  if (future) return 'cell is-future';
  if (status === 'ontime') return 'cell is-ontime';
  if (status === 'late') return 'cell is-late';
  if (status === 'missed') return 'cell is-missed';
  return 'cell is-empty';
}

export function Week() {
  const { settings, logs } = useStore();
  const now = useNow(30_000);
  const ui = useUi();

  if (!settings.place) {
    return (
      <div className="empty">
        <h3>No location yet</h3>
        <p>Add a city in Settings to see your week.</p>
      </div>
    );
  }

  const today = placeCivilDate(now, settings);
  const todayKey = dateKey(today);
  const days = Array.from({ length: 7 }, (_, index) => addDays(today, index - 6)).map((date) =>
    prayerDay(date, settings),
  );

  let done = 0;
  let expected = 0;

  for (const day of days) {
    const entry = logs[day.key] ?? {};
    for (const slot of day.slots) {
      if (slot.start.getTime() <= now.getTime()) expected += 1;
      const status = entry[slot.key]?.s;
      if (status === 'ontime' || status === 'late') done += 1;
    }
  }

  const pct = expected > 0 ? Math.round((done / expected) * 100) : 0;

  return (
    <div className="fade-in">
      <header className="screen-head">
        <h1>Your week</h1>
        <p>A record, not a scoreboard. Tap any cell to correct it.</p>
      </header>

      <div className="week-summary">
        <strong className="tnum">{done}</strong>
        <span>
          of {expected} prayers prayed this week
        </span>
      </div>
      <div className="progress" aria-hidden="true">
        <i style={{ width: `${pct}%` }} />
      </div>

      <div className="grid" role="grid" aria-label="Prayers over the last seven days">
        <div className="grid-label" aria-hidden="true" />
        {days.map((day) => {
          const isToday = day.key === todayKey;
          return (
            <div key={`head-${day.key}`} className={`grid-day${isToday ? ' is-today' : ''}`}>
              {fmtWeekdayShort(day.day).slice(0, 2)}
              <em className="tnum">{fmtDayNumber(day.day)}</em>
            </div>
          );
        })}

        {PRAYERS.map((prayer) => (
          <div key={prayer.key} style={{ display: 'contents' }}>
            <div className="grid-label">{prayer.name.slice(0, 3)}</div>
            {days.map((day) => {
              const slot = day.slots.find((entry) => entry.key === prayer.key);
              const status = logs[day.key]?.[prayer.key]?.s;
              const future = !slot || slot.start.getTime() > now.getTime();
              return (
                <button
                  key={`${day.key}-${prayer.key}`}
                  type="button"
                  className={cellClass(status, future)}
                  disabled={future}
                  onClick={() => ui.openPrayer(day.key, prayer.key)}
                  aria-label={`${prayer.name} on ${day.key}: ${future ? 'not yet' : statusText(status)}`}
                >
                  {status === 'ontime' ? (
                    <Icon name="check" size={15} strokeWidth={2.6} />
                  ) : status === 'late' ? (
                    <Icon name="clock" size={14} strokeWidth={2} />
                  ) : status === 'missed' ? (
                    <Icon name="dash" size={15} strokeWidth={2} />
                  ) : (
                    <Icon name="circle" size={7} strokeWidth={2} />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="legend">
        <span>
          <i style={{ background: 'var(--green-700)' }} />
          Prayed
        </span>
        <span>
          <i style={{ background: 'color-mix(in srgb, var(--gold) 45%, transparent)' }} />
          Late
        </span>
        <span>
          <i style={{ background: 'var(--surface-3)' }} />
          Not prayed
        </span>
        <span>
          <i style={{ border: '1px dashed var(--line-strong)' }} />
          Not logged
        </span>
      </div>

      <p className="footnote">
        Days run from Fajr to Fajr, so a late Isha still belongs to the day it started.
      </p>
    </div>
  );
}
