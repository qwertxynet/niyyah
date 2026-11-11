import { useEffect, useState } from 'react';
import { fmtLongDate, fmtTime } from '../../domain/format';
import {
  ENERGY,
  entrySummary,
  KINDS,
  kindMeta,
  MOODS,
  promptFor,
  type EnergyKey,
  type JournalEntry,
  type JournalKind,
  type MoodKey,
} from '../../domain/journal';
import { parseDayKey, placeCivilDate, prayerDay, prayerMeta, dateKey } from '../../domain/prayer-times';
import { actions, useStore } from '../../domain/store';
import type { PrayerKey } from '../../domain/types';
import { Segmented } from '../components/Controls';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icons';
import { useUi, type JournalIntent } from '../ui-context';
import { useNow } from '../useNow';
import { Week } from './Week';
import { t } from '../../i18n';
import { celebrate } from '../celebrate';

type View = 'entries' | 'week';
const VIEW_KEY = 'niyyah.journal.view';

function readView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'week' ? 'week' : 'entries';
  } catch {
    return 'entries';
  }
}

export function Journal({ intent, onIntentUsed }: { intent: JournalIntent | null; onIntentUsed: () => void }) {
  const [view, setView] = useState<View>(() => (intent ? 'entries' : readView()));

  useEffect(() => {
    if (intent) setView('entries');
  }, [intent]);

  function choose(next: View) {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="fade-in journal">
      <header className="screen-head">
        <h1>{t('Journal')}</h1>
        <p>{t('Private to this device. Write as little or as much as you like.')}</p>
      </header>

      <div className="journal-switch">
        <Segmented<View>
          value={view}
          onChange={choose}
          label={t('Journal view')}
          options={[
            { value: 'entries', label: t('Journal') },
            { value: 'week', label: t('Prayer week') },
          ]}
        />
      </div>

      {view === 'entries' ? <Entries intent={intent} onIntentUsed={onIntentUsed} /> : <Week embedded />}
    </div>
  );
}

function Entries({ intent, onIntentUsed }: { intent: JournalIntent | null; onIntentUsed: () => void }) {
  const state = useStore();
  const { settings, journal, logs } = state;
  const now = useNow(60_000);
  const ui = useUi();

  const todayKey = dateKey(placeCivilDate(now, settings));
  const [kind, setKind] = useState<JournalKind>(intent?.kind ?? 'checkin');
  const [shift, setShift] = useState(0);
  const [text, setText] = useState('');
  const [items, setItems] = useState(['', '', '']);
  const [mood, setMood] = useState<MoodKey | null>(null);
  const [energy, setEnergy] = useState<EnergyKey | null>(null);
  const [prayer, setPrayer] = useState<PrayerKey | ''>(intent?.prayer ?? '');

  // A Reflect tap from Today lands here with the right kind and prayer chosen.
  useEffect(() => {
    if (!intent) return;
    setKind(intent.kind);
    if (intent.prayer) setPrayer(intent.prayer);
    setShift(0);
    onIntentUsed();
    window.scrollTo(0, 0);
  }, [intent, onIntentUsed]);

  const prayedToday = settings.place
    ? prayerDay(parseDayKey(todayKey), settings).slots.filter((slot) => {
        const s = logs[todayKey]?.[slot.key]?.s;
        return s === 'ontime' || s === 'late';
      })
    : [];

  useEffect(() => {
    if (kind === 'reflection' && !prayer && prayedToday.length) setPrayer(prayedToday[prayedToday.length - 1].key);
  }, [kind, prayer, prayedToday]);

  const prayerName = prayer ? prayerMeta(prayer).name : undefined;
  const prompt = promptFor(kind, todayKey, shift, prayerName);

  const canSave =
    kind === 'checkin'
      ? Boolean(mood || energy || text.trim())
      : kind === 'gratitude'
        ? items.some((item) => item.trim())
        : Boolean(text.trim());

  function reset() {
    setText('');
    setItems(['', '', '']);
    setMood(null);
    setEnergy(null);
  }

  function save(button?: Element) {
    if (!canSave) return;
    celebrate(button, { count: 10 });
    const entry: Omit<JournalEntry, 'id' | 'at'> = {
      kind,
      prompt,
      text: text.trim(),
      ...(kind === 'gratitude' ? { items: items.map((item) => item.trim()).filter(Boolean) } : {}),
      ...(kind === 'checkin' ? { mood: mood ?? undefined, energy: energy ?? undefined } : {}),
      ...(kind === 'reflection' && prayer ? { prayer } : {}),
    };
    const id = actions.addJournal(todayKey, entry);
    reset();
    ui.toast(t('{what} saved', { what: kindMeta(kind).label }), () => actions.removeJournal(todayKey, id));
  }

  function remove(dayKeyValue: string, entry: JournalEntry) {
    const removed = actions.removeJournal(dayKeyValue, entry.id);
    ui.toast(t('Entry deleted'), () => {
      if (removed) actions.restoreJournal(dayKeyValue, removed);
    });
  }

  const days = Object.keys(journal).sort().reverse();
  const openDuas = days.flatMap((key) =>
    (journal[key] ?? []).filter((entry) => entry.kind === 'dua' && !entry.answered).map((entry) => ({ key, entry })),
  );

  return (
    <>
      <section className="composer card" aria-label={t('New journal entry')}>
        <div className="kind-tabs" role="tablist" aria-label={t('Kind of entry')}>
          {KINDS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={kind === entry.id}
              className="kind-tab"
              onClick={() => {
                setKind(entry.id);
                setShift(0);
              }}
            >
              {t(entry.label)}
            </button>
          ))}
        </div>

        <p className="composer-hint">
          <span className="arabic ar-dup">{kindMeta(kind).arabic}</span> {kindMeta(kind).hint}
        </p>

        {kind === 'reflection' ? (
          <label className="field composer-prayer">
            <span className="field-label">{t('After which prayer?')}</span>
            <select className="select" value={prayer} onChange={(event) => setPrayer(event.target.value as PrayerKey | '')}>
              <option value="">{t('Not a particular prayer')}</option>
              {(prayedToday.length ? prayedToday : prayerDay(parseDayKey(todayKey), settings).slots).map((slot) => (
                <option key={slot.key} value={slot.key}>
                  {slot.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="composer-prompt">
          <p>{prompt}</p>
          <button type="button" className="composer-shuffle" onClick={() => setShift((value) => value + 1)}>
            <Icon name="refresh" size={14} /> {t('Different prompt')}
          </button>
        </div>

        {kind === 'checkin' ? (
          <>
            <p className="field-label">{t('Mood')}</p>
            <div className="pick-row" role="group" aria-label={t('Mood')}>
              {MOODS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="pick"
                  aria-pressed={mood === option.id}
                  onClick={() => setMood(mood === option.id ? null : option.id)}
                >
                  <span aria-hidden="true">{option.face}</span>
                  {t(option.label)}
                </button>
              ))}
            </div>
            <p className="field-label">{t('Energy')}</p>
            <div className="pick-row" role="group" aria-label={t('Energy')}>
              {ENERGY.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="pick"
                  aria-pressed={energy === option.id}
                  onClick={() => setEnergy(energy === option.id ? null : option.id)}
                >
                  {t(option.label)}
                </button>
              ))}
            </div>
          </>
        ) : null}

        {kind === 'gratitude' ? (
          <div className="grat-list">
            {items.map((item, index) => (
              <label key={index} className="grat-item">
                <span className="grat-num tnum">{index + 1}</span>
                <input
                  className="input"
                  value={item}
                  maxLength={160}
                  placeholder={index === 0 ? t('Something you are grateful for') : t('And another')}
                  aria-label={t('Gratitude {n}', { n: index + 1 })}
                  onChange={(event) => setItems(items.map((value, i) => (i === index ? event.target.value : value)))}
                />
              </label>
            ))}
          </div>
        ) : (
          <textarea
            className="input composer-text"
            rows={kind === 'checkin' ? 2 : 4}
            maxLength={4000}
            placeholder={kind === 'checkin' ? t('Optional — a line or two') : t('Write here…')}
            aria-label={prompt}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        )}

        <button
          type="button"
          className="btn btn-solid btn-block"
          disabled={!canSave}
          onClick={(event) => save(event.currentTarget)}
        >
          {t('Save {what}', { what: kindMeta(kind).label.toLowerCase() })}
        </button>
      </section>

      {openDuas.length ? (
        <section className="section">
          <div className="section-head">
            <h2>{t('Duas you are making')}</h2>
            <span className="meta">{t('{n} open', { n: openDuas.length })}</span>
          </div>
          <ul className="dua-list">
            {openDuas.map(({ key, entry }) => (
              <li key={entry.id} className="dua card">
                <p>{entry.text}</p>
                <div className="dua-foot">
                  <span className="muted">{t('Since {date}', { date: fmtLongDate(parseDayKey(key)) })}</span>
                  <button
                    type="button"
                    className="btn btn-quiet"
                    onClick={(event) => {
                      celebrate(event.currentTarget, { count: 14 });
                      actions.updateJournal(key, entry.id, { answered: Date.now() });
                      ui.toast(t('Marked as answered · Alhamdulillah'), () =>
                        actions.updateJournal(key, entry.id, { answered: undefined }),
                      );
                    }}
                  >
                    <Icon name="check" size={15} /> {t('Answered')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="section">
        <div className="section-head">
          <h2>{t('Your entries')}</h2>
        </div>
        {days.length === 0 ? (
          <EmptyState title={t('Nothing yet')}>{t('Start with a check-in above. Two taps is a whole entry.')}</EmptyState>
        ) : (
          days.map((key) => (
            <div key={key} className="jday">
              <p className="jday-date">{key === todayKey ? t('Today') : fmtLongDate(parseDayKey(key))}</p>
              {[...(journal[key] ?? [])].reverse().map((entry) => (
                <EntryCard key={entry.id} entry={entry} onDelete={() => remove(key, entry)} timeFormat={settings.timeFormat} />
              ))}
            </div>
          ))
        )}
      </section>
    </>
  );
}

function EntryCard({
  entry,
  onDelete,
  timeFormat,
}: {
  entry: JournalEntry;
  onDelete: () => void;
  timeFormat: '12h' | '24h';
}) {
  const meta = kindMeta(entry.kind);
  const mood = MOODS.find((option) => option.id === entry.mood);
  const energy = ENERGY.find((option) => option.id === entry.energy);
  return (
    <article className={`jentry card is-${entry.kind}`}>
      <div className="jentry-top">
        <span className="jentry-kind">
          {meta.label}
          {entry.prayer ? ` · ${t('after {name}', { name: prayerMeta(entry.prayer).name })}` : ''}
        </span>
        <span className="jentry-time tnum">{fmtTime(new Date(entry.at), timeFormat)}</span>
        <button type="button" className="jentry-delete" onClick={onDelete} aria-label={t('Delete entry')}>
          <Icon name="close" size={15} />
        </button>
      </div>
      <p className="jentry-prompt">{entry.prompt}</p>
      {mood || energy ? (
        <p className="jentry-tags">
          {mood ? (
            <span className="tag">
              {mood.face} {t(mood.label)}
            </span>
          ) : null}
          {energy ? <span className="tag">{t('Energy: {level}', { level: t(energy.label) })}</span> : null}
        </p>
      ) : null}
      {entry.kind === 'gratitude' && entry.items?.length ? (
        <ol className="jentry-items">
          {entry.items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ol>
      ) : entrySummary(entry) ? (
        <p className="jentry-text">{entrySummary(entry)}</p>
      ) : null}
      {entry.kind === 'dua' && entry.answered ? <p className="jentry-answered">{t('Answered · Alhamdulillah')}</p> : null}
    </article>
  );
}
