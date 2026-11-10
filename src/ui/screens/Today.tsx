import { CatchupCard } from '../components/CatchupCard';
import { Icon } from '../components/Icons';
import { PrayerRow } from '../components/PrayerRow';
import { QadaCard } from '../components/QadaCard';
import { Term } from '../components/Term';
import { deviceTimeZone, fmtLongDate, fmtTime, hijriDate } from '../../domain/format';
import { say } from '../../domain/copy';
import { kindMeta, promptFor, type JournalKind } from '../../domain/journal';
import { RAKAHS } from '../../domain/hasanat';
import {
  addDays,
  cycleAt,
  dateKey,
  fmtLeft,
  placeCivilDate,
  prayerDay,
  type Slot,
} from '../../domain/prayer-times';
import { actions, useStore } from '../../domain/store';
import type { Logs, Persisted, PrayerKey, Settings } from '../../domain/types';
import { useNow } from '../useNow';
import { useUi } from '../ui-context';

const URGENT_MS = 20 * 60 * 1000;
/** An after-prayer reflection is offered for this long after logging. */
const REFLECT_WINDOW_MS = 3 * 60 * 60 * 1000;

/**
 * Which journal prompt to offer on Today, if any: a reflection for a prayer
 * just logged, otherwise the day's check-in, then gratitude after Maghrib and
 * an intention after Isha. One card at most, and only until it is written.
 */
function pickReflect(
  now: Date,
  state: Persisted,
): { kind: JournalKind; prayer?: PrayerKey; prayerName?: string; dayKey: string } | null {
  const { settings, logs, journal } = state;
  const dayKeyValue = dateKey(placeCivilDate(now, settings));
  const written = journal[dayKeyValue] ?? [];
  const has = (kind: JournalKind, prayer?: PrayerKey) =>
    written.some((entry) => entry.kind === kind && (!prayer || entry.prayer === prayer));

  const day = prayerDay(placeCivilDate(now, settings), settings);
  const recent = day.slots
    .map((slot) => ({ slot, entry: logs[day.key]?.[slot.key] }))
    .filter(({ entry }) => entry && entry.s !== 'missed' && now.getTime() - entry.at < REFLECT_WINDOW_MS)
    .sort((a, b) => (b.entry?.at ?? 0) - (a.entry?.at ?? 0))[0];
  if (recent && !has('reflection', recent.slot.key)) {
    return { kind: 'reflection', prayer: recent.slot.key, prayerName: recent.slot.name, dayKey: dayKeyValue };
  }

  if (!has('checkin')) return { kind: 'checkin', dayKey: dayKeyValue };
  const maghrib = day.slots.find((slot) => slot.key === 'maghrib');
  const isha = day.slots.find((slot) => slot.key === 'isha');
  if (maghrib && now >= maghrib.start && !has('gratitude')) return { kind: 'gratitude', dayKey: dayKeyValue };
  if (isha && now >= isha.start && !has('intention')) return { kind: 'intention', dayKey: dayKeyValue };
  return null;
}
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
  // Minutes-only countdowns don't need a once-a-second redraw.
  const now = useNow(settings.coarseTime ? 30_000 : 1000);
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
  const catchup = settings.catchup ? findCatchup(now, settings, logs, dismissed) : null;
  const voice = { tone: settings.tone, literal: settings.literal };
  const askAbout = !settings.profile && !settings.profileAsked;
  const guidePrayer = (current && !currentStatus ? current : next?.slot) ?? null;
  const reflect = pickReflect(now, state);
  const name = settings.name?.trim();

  function logCurrent(status: 'ontime' | 'late' | 'missed') {
    if (!current) return;
    actions.setStatus(cycle.active.key, current.key, status);
    ui.toast(
      status === 'ontime'
        ? say('toastPrayed', voice, { name: current.name })
        : `${current.name} · ${status === 'late' ? 'prayed late' : 'not prayed'}`,
      () => actions.setStatus(cycle.active.key, current.key, null),
    );
  }

  const showHeroWindow = isDue && current;
  const showHeroNext = !showHeroWindow && next;

  return (
    <div className="fade-in">
      <header style={{ marginBottom: 16 }}>
        {name ? <p className="greet">Assalamu ‘alaykum, {name}</p> : null}
        <p className="hijri">{hijriDate(now)}</p>
        <h1 className="dateline">{fmtLongDate(now)}</h1>
        {settings.place.timezone !== deviceTimeZone() ? (
          <p className="setting-hint" style={{ marginTop: 4 }}>
            Times shown in {settings.place.label} time ({settings.place.timezone})
          </p>
        ) : null}
      </header>

      {askAbout ? (
        <section className="catchup ask-card" aria-label="Personalise Niyyah">
          <div className="catchup-icon" aria-hidden="true">
            <Icon name="spark" size={18} />
          </div>
          <div className="catchup-body">
            <p className="catchup-title">Help Niyyah fit you</p>
            <p className="catchup-text">
              Three quick questions about you, ADHD and autism. You&apos;ll see exactly what changes, and can undo
              any of it.
            </p>
            <div className="catchup-actions">
              <button type="button" className="btn btn-solid" onClick={() => ui.openAboutYou()}>
                Start
              </button>
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() => actions.updateSettings({ profileAsked: true })}
              >
                Not now
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {catchup ? (
        <CatchupCard
          slot={catchup.slot}
          text={say('catchupText', voice, {
            name: catchup.slot.name,
            end: fmtTime(catchup.slot.end, settings.timeFormat),
          })}
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
              <span className="eyebrow">{say('heroDueEyebrow', voice)}</span>
              <span className="hero-badge">
                <span className="pulse" aria-hidden="true" />
                {say(urgent ? 'badgeSoon' : 'badgeOpen', voice)}
              </span>
            </div>

            <div className="hero-line">
              <h2 className="hero-name">
                {current.name}
                <span className="arabic">{current.arabic}</span>
              </h2>
              <span className={`countdown tnum${urgent ? ' is-urgent' : ''}`} role="timer" aria-live="off">
                {fmtLeft(msLeft, settings.coarseTime)}
              </span>
            </div>
            <p className="hero-sub">
              {say('heroDueSub', voice, { name: current.name, end: fmtTime(current.end, settings.timeFormat) })}
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
              <span className="eyebrow">{say('heroNextEyebrow', voice)}</span>
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
                {fmtLeft(next.at.getTime() - now.getTime(), settings.coarseTime)}
              </span>
            </div>
            <p className="hero-sub">
              {say('heroNextSub', voice, { name: next.slot.name, start: fmtTime(next.at, settings.timeFormat) })}
              {next.slot.name === 'Fajr' && !settings.literal ? ' · tomorrow begins with Fajr' : ''}
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

      {reflect ? (
        <section className="reflect-card" aria-label="Journal prompt">
          <p className="reflect-label">
            <Icon name="book" size={15} />{' '}
            {reflect.kind === 'reflection' ? `You prayed ${reflect.prayerName}` : kindMeta(reflect.kind).label}
          </p>
          <p className="reflect-prompt">{promptFor(reflect.kind, reflect.dayKey, 0, reflect.prayerName)}</p>
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => ui.openJournal({ kind: reflect.kind, prayer: reflect.prayer })}
          >
            {reflect.kind === 'checkin' ? 'Check in' : 'Write'} <Icon name="arrowRight" size={15} />
          </button>
        </section>
      ) : null}

      {settings.learn && guidePrayer ? (
        <section className="learn-card" aria-label="Step-by-step guides">
          <p className="learn-title">
            <Icon name="star" size={16} /> Step by step
          </p>
          <div className="learn-actions">
            <button type="button" className="btn btn-quiet" onClick={() => ui.openGuide({ kind: 'wudu' })}>
              Wudu
            </button>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => ui.openGuide({ kind: 'prayer', prayer: guidePrayer.key })}
            >
              How to pray {guidePrayer.name} · {RAKAHS[guidePrayer.key]} rak{'\u2018'}ah
            </button>
          </div>
        </section>
      ) : null}

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
          <h2>
            Today&apos;s <Term id="salah">prayers</Term>
          </h2>
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
                ui.toast(say('toastPrayed', voice, { name: slot.name }), () =>
                  actions.setStatus(cycle.active.key, slot.key, null),
                );
              }}
            />
          ))}
        </ul>
      </section>

      {settings.qadaEnabled ? (
        <section className="section">
          <div className="section-head">
            <h2>
              <Term id="qada">Making up</Term>
            </h2>
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
