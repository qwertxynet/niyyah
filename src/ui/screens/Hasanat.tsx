import { useEffect, useRef, useState } from 'react';
import { fmtTime } from '../../domain/format';
import {
  DEEDS,
  fmtHasanat,
  hasanatTotals,
  prayerHasanat,
  TIERS,
  type DeedDef,
  type Tier,
} from '../../domain/hasanat';
import { say } from '../../domain/copy';
import { placeCivilDate, prayerDay } from '../../domain/prayer-times';
import { useQuran } from '../../domain/quran';
import { actions, useStore } from '../../domain/store';
import { EstimateSheet } from '../components/EstimateSheet';
import { Icon } from '../components/Icons';
import { Term } from '../components/Term';
import { ReadingSheet } from '../components/ReadingSheet';
import { TapCounter } from '../components/TapCounter';
import { buzz, useCountUp } from '../useCountUp';
import { useNow } from '../useNow';
import { useUi } from '../ui-context';

const TIER_KEY = 'niyyah.hasanat.tier';

function readTier(): Tier {
  try {
    const saved = localStorage.getItem(TIER_KEY);
    if (saved && TIERS.some((tier) => tier.id === saved)) return saved as Tier;
  } catch {
    /* ignore */
  }
  return 'quick';
}

export function Hasanat() {
  const state = useStore();
  const { settings, logs } = state;
  const meta = useQuran();
  const now = useNow(60_000);
  const ui = useUi();

  const [tier, setTier] = useState<Tier>(readTier);
  const [counting, setCounting] = useState<DeedDef | null>(null);
  const [reading, setReading] = useState<DeedDef | null>(null);
  const [explain, setExplain] = useState(false);

  const totals = hasanatTotals(state, now, meta);
  // "Minimal" tone skips celebrations: no count-up, shimmer or buzz.
  const quiet = settings.tone === 'minimal';
  const counted = useCountUp(totals.today);
  const today = quiet ? { value: totals.today, rising: false } : counted;

  // A small tick in the hand whenever today's figure grows.
  const lastToday = useRef(totals.today);
  useEffect(() => {
    if (totals.today > lastToday.current && !quiet) buzz(18);
    lastToday.current = totals.today;
  }, [totals.today, quiet]);

  if (!settings.place) {
    return (
      <div className="empty">
        <h3>No location yet</h3>
        <p>Add a city in Settings to start counting.</p>
      </div>
    );
  }

  const day = prayerDay(placeCivilDate(now, settings), settings);
  const dayLog = logs[day.key] ?? {};

  function chooseTier(next: Tier) {
    setTier(next);
    try {
      localStorage.setItem(TIER_KEY, next);
    } catch {
      /* ignore */
    }
  }

  function record(deed: DeedDef, label: string, hasanat: number) {
    const key = totals.todayKey;
    const id = actions.addDeed(key, { rule: deed.id, label, h: Math.round(hasanat) });
    ui.toast(`${label} · ≈ +${fmtHasanat(hasanat)}`, () => actions.removeDeed(key, id));
  }

  function start(deed: DeedDef) {
    if (deed.kind === 'count') setCounting(deed);
    else if (deed.kind === 'juz' || deed.kind === 'range') setReading(deed);
    else {
      const estimate = deed.estimate(meta);
      if (estimate !== null) record(deed, deed.title, estimate);
    }
  }

  const doneToday = new Map<string, number>();
  for (const deed of state.deeds[totals.todayKey] ?? []) doneToday.set(deed.rule, (doneToday.get(deed.rule) ?? 0) + 1);

  return (
    <div className="hasanat fade-in">
      <header className="screen-head">
        <h1>
          <Term id="hasanat" />
        </h1>
        <p>{say('hasanatSub', settings)}</p>
      </header>

      <div className="card-soft notice" role="note">
        <span className="notice-mark" aria-hidden="true">
          <Icon name="star" size={18} />
        </span>
        <p>
          Only Allah knows the reward of any deed. These numbers are an estimate from narrated hadith, meant as
          encouragement, not a measure.
        </p>
      </div>

      <section className="tally" aria-label="Estimated hasanat">
        <span className="tally-label">Today</span>
        <span className={today.rising ? 'tally-value tnum is-rising' : 'tally-value tnum'} aria-live="polite">
          <small>≈</small> {fmtHasanat(today.value)}
        </span>
        <div className="tally-row">
          <div>
            <span className="tally-sub-label">This week</span>
            <span className="tally-sub tnum">{fmtHasanat(totals.week)}</span>
          </div>
          <div>
            <span className="tally-sub-label">All time</span>
            <span className="tally-sub tnum">{fmtHasanat(totals.all)}</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>From your prayers</h2>
          <span className="meta">Recitation is optional</span>
        </div>
        <ul className="hp-list card">
          {day.slots.map((slot) => {
            const entry = dayLog[slot.key];
            const value = prayerHasanat(entry, slot.key, meta);
            const prayed = entry && entry.s !== 'missed';
            const started = now >= slot.start;
            const extras = (entry?.r?.length ?? 0) > 0 || entry?.j;
            return (
              <li key={slot.key} className="hp-row">
                <span className="hp-name">
                  {slot.name} <span className="arabic">{slot.arabic}</span>
                </span>
                <span className="hp-value tnum">
                  {prayed ? `≈ ${fmtHasanat(value)}` : entry ? 'Not today' : started ? '' : fmtTime(slot.start, settings.timeFormat)}
                </span>
                {prayed ? (
                  <button
                    type="button"
                    className="hp-action"
                    onClick={() => ui.openRecitation(day.key, slot.key)}
                  >
                    {extras ? 'Edit' : '+ Recitation'}
                  </button>
                ) : started && !entry ? (
                  <button type="button" className="hp-action" onClick={() => ui.openPrayer(day.key, slot.key)}>
                    Log
                  </button>
                ) : (
                  <span className="hp-action-spacer" />
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Good deeds</h2>
          <span className="meta">By the time you have</span>
        </div>
        <div className="tier-tabs" role="tablist" aria-label="Time commitment">
          {TIERS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={tier === entry.id}
              className="tier-tab"
              onClick={() => chooseTier(entry.id)}
            >
              <b>{entry.label}</b>
              <span>{entry.hint}</span>
            </button>
          ))}
        </div>

        <div className="deeds" role="tabpanel">
          {DEEDS.filter((deed) => deed.tier === tier).map((deed) => {
            const estimate = deed.estimate(meta);
            const times = doneToday.get(deed.id) ?? 0;
            return (
              <article key={deed.id} className="deed card">
                <div className="deed-top">
                  <div className="deed-titles">
                    <h3>{deed.title}</h3>
                    <span className="deed-arabic arabic">{deed.arabic}</span>
                  </div>
                  <span className="deed-gain tnum">
                    {deed.kind === 'range' ? 'by length' : estimate === null ? '…' : `≈ +${fmtHasanat(estimate)}`}
                    {deed.kind === 'juz' ? <small> avg</small> : null}
                  </span>
                </div>
                <p className="deed-virtue">{deed.virtue}</p>
                <div className="deed-foot">
                  <span className="deed-time">
                    <Icon name="clock" size={14} /> {deed.time}
                    {times > 0 ? <span className="deed-done">{` · done${times > 1 ? ` ${times}×` : ''} today`}</span> : null}
                  </span>
                  <button type="button" className="btn btn-solid deed-btn" onClick={() => start(deed)}>
                    {deed.kind === 'count' ? 'Start' : deed.kind === 'once' ? 'I did this' : 'Choose'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <button type="button" className="explain-link" onClick={() => setExplain(true)}>
        How is this estimated?
      </button>

      {counting ? (
        <TapCounter
          deed={counting}
          estimate={counting.estimate(meta) ?? 0}
          onClose={() => setCounting(null)}
          onSave={(hasanat, done, total) => {
            record(counting, done < total ? `${counting.title} (${done} of ${total})` : counting.title, hasanat);
            setCounting(null);
          }}
        />
      ) : null}

      <ReadingSheet
        deed={reading}
        onClose={() => setReading(null)}
        onSave={(label, hasanat) => {
          if (reading) record(reading, label, hasanat);
          setReading(null);
        }}
      />

      <EstimateSheet open={explain} onClose={() => setExplain(false)} />
    </div>
  );
}
