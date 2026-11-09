import { CatchupCard } from '../components/CatchupCard';
import { Icon } from '../components/Icons';
import { PrayerRow } from '../components/PrayerRow';
import { QadaCard } from '../components/QadaCard';
import { deviceTimeZone, fmtLongDate, fmtTime, hijriDate } from '../../domain/format';
import {
  addDays,
  cycleAt,
  formatOffset,
  placeCivilDate,
  prayerDay,
  type Slot,
} from '../../domain/prayer-times';
import { actions, useStore } from '../../domain/store';
import type { Logs, Persisted, Settings } from '../../domain/types';
import { useNow } from '../useNow';
import { useUi } from '../ui-context';

const URGENT_MS = 20 * 60 * 1000;
const CATCHUP_WINDOW_MS = 18 * 60 * 60 * 1000;

function findCatchup(
  now: Date,
  settings: Settings,
  logs: Logs,
  dismissed: Persisted['dismissed'],
): { dayKey: string; slot: Slot } | null {
  const civil = placeCivilDate(now, settings);
  const days = [prayerDay(civil, settings), prayerDay(addDays(civil, -1), settings)];
  const options: { dayKey: string; slot: Slot }[] = [];

  for (const day of days) {
    for (const slot of day.slots) {
      const endedAt = slot.end.getTime();
      if (endedAt > now.getTime()) continue;
      if (now.getTime() - endedAt > CATCHUP_WINDOW_MS) continue;
      if ((logs[day.key] ?? {})[slot.key]) continue;
      if (dismissed[`${day.key}:${slot.key}`]) continue;
      options.push({ dayKey: day.key, slot });
    }
  }

  options.sort((a, b) => b.slot.start.getTime() - a.slot.start.getTime());
  return options[0] ?? null;
}

export function Today() {
  const state = useStore();
  const { settings, logs, qada, dismissed } = state;
  const now = useNow();
  const ui = useUi();

  if (!settings.place) {
    return (
      <div className="empty">
        <h3>Add a location</h3>
        <p>Niyyah needs your city to calculate prayer times on the device.</p>
      </div>
    );
  }

  const cycle = cycleAt(now, settings);
  const dayLog = logs[cycle.active.key] ?? {};
  const current = cycle.current;
  const currentStatus = current ? dayLog[current.key] : undefined;
  const next = cycle.next;

  const started = current ? current.start.getTime() <= now.getTime() : false;
  const isDue = Boolean(current && started && !currentStatus);
  const msLeft = current ? current.end.getTime() - now.getTime() : 0;
  const total = current ? current.end.getTime() - current.start.getTime() : 1;
  const elapsed = current ? now.getTime() - current.start.getTime() : 0;
  const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
  const urgent = msLeft > 0 && msLeft < URGENT_MS;

  const loggedCount = Object.values(dayLog).filter(Boolean).length;
  const catchup = findCatchup(now, settings, logs, dismissed);

  function logCurrent(status: 'ontime' | 'late' | 'missed') {
    if (!current) return;
    actions.setStatus(cycle.active.key, current.key, status);
    ui.toast(
      `${current.name} · ${status === 'ontime' ? 'prayed' : status === 'late' ? 'prayed late' : 'not prayed'}`,
      () => actions.setStatus(cycle.active.key, current.key, null),
    );
  }

  const showHeroWindow = isDue && current;
  const showHeroNext = !showHeroWindow && next;

  return (
    <div className="fade-in">
      <header style={{ marginBottom: 16 }}>
        <p className="hijri">{hijriDate(now)}</p>
        <h1 className="dateline">{fmtLongDate(now)}</h1>
        {settings.place.timezone !== deviceTimeZone() ? (
          <p className="setting-hint" style={{ marginTop: 4 }}>
            Times shown in {settings.place.label} time ({settings.place.timezone})
          </p>
        ) : null}
      </header>

      {catchup ? (
        <CatchupCard
          slot={catchup.slot}
          timeFormat={settings.timeFormat}
          onYes={() => {
            actions.setStatus(catchup.dayKey, catchup.slot.key, 'late');
            ui.toast(`${catchup.slot.name} marked as prayed`, () =>
              actions.setStatus(catchup.dayKey, catchup.slot.key, null),
            );
          }}
          onNo={() => {
            actions.setStatus(catchup.dayKey, catchup.slot.key, 'missed');
            ui.toast(`${catchup.slot.name} recorded`, () =>
              actions.setStatus(catchup.dayKey, catchup.slot.key, null),
            );
          }}
          onSkip={() => actions.dismissCatchup(`${catchup.dayKey}:${catchup.slot.key}`)}
        />
      ) : null}

      <section className="hero" aria-label="Current prayer window">
        {showHeroWindow && current ? (
          <>
            <div className="hero-top">
              <span className="eyebrow">Window closing</span>
              <span className="hero-badge">
                <span className="pulse" aria-hidden="true" />
                {urgent ? 'Soon' : 'Open now'}
              </span>
            </div>

            <div className="hero-line">
              <h2 className="hero-name">
                {current.name}
                <span className="arabic">{current.arabic}</span>
              </h2>
              <span className={`countdown tnum${urgent ? ' is-urgent' : ''}`} role="timer" aria-live="off">
                {formatOffset(msLeft)}
              </span>
            </div>
            <p className="hero-sub">
              left to pray · closes at <strong>{fmtTime(current.end, settings.timeFormat)}</strong>
            </p>

            <div className="window">
              <div className="window-row">
                <span>As of {fmtTime(now, settings.timeFormat)}</span>
                <span className="tnum">{Math.round(pct)}% of the window gone</span>
              </div>
              <div className="window-track">
                <div
                  className={`window-fill${urgent ? ' is-urgent' : ''}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="window-foot">
                {current.name} began {fmtTime(current.start, settings.timeFormat)}
              </p>
            </div>

            <div className="hero-actions">
              <button type="button" className="btn btn-primary" onClick={() => logCurrent('ontime')}>
                <Icon name="check" size={17} strokeWidth={2.6} />I prayed {current.name}
              </button>
            </div>
          </>
        ) : showHeroNext && next ? (
          <>
            <div className="hero-top">
              <span className="eyebrow">Next prayer</span>
              <span className="hero-badge">
                <span className="pulse" aria-hidden="true" />
                {currentStatus ? `${current?.name} logged` : 'All clear'}
              </span>
            </div>
            <div className="hero-line">
              <h2 className="hero-name">
                {next.slot.name}
                <span className="arabic">{next.slot.arabic}</span>
              </h2>
              <span className="countdown tnum" role="timer" aria-live="off">
                {formatOffset(next.at.getTime() - now.getTime())}
              </span>
            </div>
            <p className="hero-sub">
              adhan at <strong>{fmtTime(next.at, settings.timeFormat)}</strong>
              {next.slot.name === 'Fajr' ? ' · tomorrow begins with Fajr' : ''}
            </p>
            <div className="window">
              <div className="window-track">
                <div
                  className="window-fill"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        ((now.getTime() - (current?.start.getTime() ?? next.at.getTime() - 1)) /
                          (next.at.getTime() - (current?.start.getTime() ?? next.at.getTime() - 1))) *
                          100,
                      ),
                    )}%`,
                  }}
                />
              </div>
            </div>
          </>
        ) : (
          <p className="hero-sub">No prayer times available for this location and date.</p>
        )}
      </section>

      {cycle.degraded ? (
        <div className="note warn" style={{ marginTop: 12 }}>
          <b>Unusual daylight at this latitude.</b> Times today are estimates. A different high-latitude
          rule in Settings may give a better result.
        </div>
      ) : null}

      {cycle.active.key !== cycle.today.key ? (
        <p className="setting-hint" style={{ marginTop: 12, textAlign: 'center' }}>
          Still in yesterday&apos;s Isha window — the new day starts at Fajr.
        </p>
      ) : null}

      <section className="section">
        <div className="section-head">
          <h2>Today&apos;s prayers</h2>
          <span className="meta tnum">{loggedCount} of 5 logged</span>
        </div>
        <ul className="list">
          {cycle.active.slots.map((slot) => (
            <PrayerRow
              key={slot.key}
              slot={slot}
              status={dayLog[slot.key]?.s}
              timeFormat={settings.timeFormat}
              now={now}
              onOpen={() => ui.openPrayer(cycle.active.key, slot.key)}
              onQuickLog={() => {
                const existing = dayLog[slot.key]?.s;
                if (existing) {
                  ui.openPrayer(cycle.active.key, slot.key);
                  return;
                }
                actions.setStatus(cycle.active.key, slot.key, 'ontime');
                ui.toast(`${slot.name} · prayed`, () => actions.setStatus(cycle.active.key, slot.key, null));
              }}
            />
          ))}
        </ul>
      </section>

      {settings.qadaEnabled ? (
        <section className="section">
          <div className="section-head">
            <h2>Making up</h2>
          </div>
          <QadaCard count={qada} />
        </section>
      ) : null}

      <p className="footnote">
        Times calculated on this device with adhan · works without a signal
      </p>
    </div>
  );
}
