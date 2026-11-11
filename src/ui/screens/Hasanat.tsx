import { useEffect, useRef, useState } from 'react';
import { fmtTime } from '../../domain/format';
import {
  DEEDS,
  fmtHasanat,
  hasanatTotals,
  prayerHasanat,
  readCovers,
  TIERS,
  type DeedDef,
  type Tier,
} from '../../domain/hasanat';
import { say } from '../../domain/copy';
import { placeCivilDate, prayerDay } from '../../domain/prayer-times';
import { useQuran } from '../../domain/quran';
import { surahTitle } from './Reader';
import { actions, useStore } from '../../domain/store';
import { EstimateSheet } from '../components/EstimateSheet';
import { Icon } from '../components/Icons';
import { EmptyState } from '../components/EmptyState';
import { Term } from '../components/Term';
import { ReadingSheet } from '../components/ReadingSheet';
import { TapCounter } from '../components/TapCounter';
import { buzz, useCountUp } from '../useCountUp';
import { useNow } from '../useNow';
import { useUi } from '../ui-context';
import { t } from '../../i18n';

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
      <EmptyState title={t('No location yet')}>{t('Add a city in Settings to start counting.')}</EmptyState>
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
    ui.toast(`${t(label)} · ≈ +${fmtHasanat(hasanat)}`, () => actions.removeDeed(key, id));
  }

  function start(deed: DeedDef) {
    if (deed.kind === 'count') setCounting(deed);
    else if (deed.kind === 'juz' || deed.kind === 'range') setReading(deed);
    else {
      const estimate = deed.estimate(meta);
      if (estimate !== null) record(deed, t(deed.title), estimate);
    }
  }

  const doneToday = new Map<string, number>();
  const todayDeeds = state.deeds[totals.todayKey] ?? [];
  for (const deed of todayDeeds) doneToday.set(deed.rule, (doneToday.get(deed.rule) ?? 0) + 1);
  // Reading a card's surah in the reader counts as doing that card.
  for (const def of DEEDS) {
    if (!def.range) continue;
    const range = def.range;
    const read = todayDeeds.filter((deed) => deed.rule === 'reader' && readCovers(deed, range)).length;
    if (read) doneToday.set(def.id, (doneToday.get(def.id) ?? 0) + read);
  }
  const readToday = todayDeeds.filter((deed) => deed.rule === 'reader').reduce((sum, deed) => sum + deed.h, 0);
  const mark = state.reading;
  const markSurah = mark && meta ? meta.surahs[mark.s - 1] : null;

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
          {t(
            'Only Allah knows the reward of any deed. These numbers are an estimate from narrated hadith, meant as encouragement, not a measure.',
          )}
        </p>
      </div>

      <section className="tally" aria-label={t('Estimated hasanat')}>
        <span className="tally-label">{t('Today')}</span>
        <span className={today.rising ? 'tally-value tnum is-rising' : 'tally-value tnum'} aria-live="polite">
          <small>≈</small> {fmtHasanat(today.value)}
        </span>
        <div className="tally-row">
          <div>
            <span className="tally-sub-label">{t('This week')}</span>
            <span className="tally-sub tnum">{fmtHasanat(totals.week)}</span>
          </div>
          <div>
            <span className="tally-sub-label">{t('All time')}</span>
            <span className="tally-sub tnum">{fmtHasanat(totals.all)}</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>{t('From your prayers')}</h2>
          <span className="meta">{t('Recitation is optional')}</span>
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
                  {slot.name} <span className="arabic ar-dup">{slot.arabic}</span>
                </span>
                <span className="hp-value tnum">
                  {prayed
                    ? `≈ ${fmtHasanat(value)}`
                    : entry
                      ? t('Not today')
                      : started
                        ? ''
                        : fmtTime(slot.start, settings.timeFormat)}
                </span>
                {prayed ? (
                  <button
                    type="button"
                    className="hp-action"
                    onClick={() => ui.openRecitation(day.key, slot.key)}
                  >
                    {extras ? t('Edit') : t('+ Recitation')}
                  </button>
                ) : started && !entry ? (
                  <button type="button" className="hp-action" onClick={() => ui.openPrayer(day.key, slot.key)}>
                    {t('Log')}
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
          <h2>{t('Read the Qur’an')}</h2>
          {readToday ? <span className="meta tnum">{t('≈ +{h} today', { h: fmtHasanat(readToday) })}</span> : null}
        </div>
        <div className="read-card card">
          <span className="read-card-ar arabic" aria-hidden="true">
            ٱقْرَأْ
          </span>
          <div className="read-card-main">
            <b>
              {markSurah && mark
                ? t('{surah} · ayah {n}', { surah: surahTitle(markSurah), n: mark.a })
                : t('Arabic text, ayah by ayah')}
            </b>
            <span>
              {markSurah ? `${t('Where you left off.')} ` : ''}
              {t('Tap the last ayah you read and its letters are counted here.')}
            </span>
          </div>
          <div className="read-card-actions">
            {markSurah && mark ? (
              <button
                type="button"
                className="btn btn-solid"
                onClick={() => {
                  const last = markSurah.l.length;
                  ui.openReader(mark.a < last ? { s: mark.s, from: mark.a + 1 } : { s: mark.s < 114 ? mark.s + 1 : 1, from: 1 });
                }}
              >
                {t('Continue')}
              </button>
            ) : null}
            <button type="button" className={markSurah ? 'btn btn-quiet' : 'btn btn-solid'} onClick={() => ui.openReader()}>
              {markSurah ? t('All surahs') : t('Open the reader')}
            </button>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>{t('Good deeds')}</h2>
          <span className="meta">{t('By the time you have')}</span>
        </div>
        <div className="tier-tabs" role="tablist" aria-label={t('Time commitment')}>
          {TIERS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={tier === entry.id}
              className="tier-tab"
              onClick={() => chooseTier(entry.id)}
            >
              <b>{t(entry.label)}</b>
              <span>{t(entry.hint)}</span>
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
                    <h3>{t(deed.title)}</h3>
                    <span className="deed-arabic arabic">{deed.arabic}</span>
                  </div>
                  <span className="deed-gain tnum">
                    {deed.kind === 'range' ? t('by length') : estimate === null ? '…' : `≈ +${fmtHasanat(estimate)}`}
                    {deed.kind === 'juz' ? <small> {t('avg')}</small> : null}
                  </span>
                </div>
                <p className="deed-virtue">{t(deed.virtue)}</p>
                <div className="deed-foot">
                  <span className="deed-time">
                    <Icon name="clock" size={14} /> {t(deed.time)}
                    {times > 0 ? (
                      <span className="deed-done">
                        {' · '}
                        {times > 1 ? t('done {n}× today', { n: times }) : t('done today')}
                      </span>
                    ) : null}
                  </span>
                  <span className="deed-btns">
                    {deed.range ? (
                      <button
                        type="button"
                        className="btn btn-quiet deed-btn"
                        onClick={() => ui.openReader({ s: deed.range?.s, from: deed.range?.from })}
                      >
                        <Icon name="book" size={15} /> {t('Read')}
                      </button>
                    ) : null}
                    <button type="button" className="btn btn-solid deed-btn" onClick={() => start(deed)}>
                      {deed.kind === 'count' ? t('Start') : deed.kind === 'once' ? t('I did this') : t('Choose')}
                    </button>
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <button type="button" className="explain-link" onClick={() => setExplain(true)}>
        {t('How is this estimated?')}
      </button>

      {counting ? (
        <TapCounter
          deed={counting}
          estimate={counting.estimate(meta) ?? 0}
          onClose={() => setCounting(null)}
          onSave={(hasanat, done, total) => {
            const title = t(counting.title);
            record(counting, done < total ? `${title} (${t('{n} of {total}', { n: done, total })})` : title, hasanat);
            setCounting(null);
          }}
        />
      ) : null}

      <ReadingSheet
        deed={reading}
        onClose={() => setReading(null)}
        onRead={(s, from) => {
          setReading(null);
          ui.openReader({ s, from });
        }}
        onSave={(label, hasanat) => {
          if (reading) record(reading, label, hasanat);
          setReading(null);
        }}
      />

      <EstimateSheet open={explain} onClose={() => setExplain(false)} />
    </div>
  );
}
