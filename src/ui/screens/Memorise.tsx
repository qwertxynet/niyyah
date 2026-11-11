import { useState } from 'react';
import { ayahKey, groupOf, sessionMinutes, todayQueue, type HifzPlan } from '../../domain/hifz';
import { dateKey, placeCivilDate } from '../../domain/prayer-times';
import { surahName, type QuranMeta } from '../../domain/quran';
import { actions, useStore } from '../../domain/store';
import { plural, t } from '../../i18n';
import { Icon } from '../components/Icons';

const JUZ_30_BACKWARDS = Array.from({ length: 114 - 78 + 1 }, (_, i) => 114 - i);

/** Ready-made plans; "Choose a surah" covers everything else. */
const PRESETS: { id: string; label: string; hint: string; surahs: number[] }[] = [
  { id: 'juz30', label: 'Juz 30, from an-Nas back', hint: 'The short surahs most people learn first', surahs: JUZ_30_BACKWARDS },
  { id: 'mulk', label: 'Surah al-Mulk', hint: '30 ayahs, often read before sleep', surahs: [67] },
  { id: 'kahf', label: 'Surah al-Kahf', hint: '110 ayahs, read on Fridays', surahs: [18] },
  { id: 'yasin', label: 'Surah Ya-Sin', hint: '83 ayahs', surahs: [36] },
];

export function useToday(): string {
  const { settings } = useStore();
  return dateKey(placeCivilDate(new Date(), settings));
}

/**
 * The memorisation tab: what you're memorising, today's short list, and a map
 * of every ayah coloured by how settled it is. No streaks, no red.
 */
export function Memorise({ meta, onStart }: { meta: QuranMeta; onStart: () => void }) {
  const { hifz } = useStore();
  const today = useToday();
  const [editing, setEditing] = useState(false);
  const [perDay, setPerDay] = useState(hifz.plan?.newPerDay ?? 2);
  const [pick, setPick] = useState(67);
  const count = (s: number) => meta.surahs[s - 1]?.l.length ?? 0;

  if (!hifz.plan || editing) {
    const choose = (surahs: number[]) => {
      const plan: HifzPlan = { surahs, newPerDay: perDay };
      actions.setHifzPlan(plan);
      setEditing(false);
    };
    return (
      <div className="hifz">
        <div className="hifz-intro card">
          <span className="read-card-ar arabic" aria-hidden="true">
            حِفْظ
          </span>
          <div>
            <b>{t('Memorise, a little each day')}</b>
            <p className="muted">
              {t('Listen, read along, let the words fade, then recite from memory. Ayahs come back for review just before you’d forget them.')}
            </p>
          </div>
        </div>

        <p className="field-label">{t('New ayahs a day')}</p>
        <div className="pick-row" role="group" aria-label={t('New ayahs a day')}>
          {[1, 2, 3, 5].map((value) => (
            <button key={value} type="button" className="pick" aria-pressed={perDay === value} onClick={() => setPerDay(value)}>
              {value}
            </button>
          ))}
        </div>

        <p className="field-label">{t('What to memorise')}</p>
        <div className="option-list">
          {PRESETS.map((preset) => (
            <button key={preset.id} type="button" className="option" onClick={() => choose(preset.surahs)}>
              <span className="option-text">
                <b>{t(preset.label)}</b>
                <span>{t(preset.hint)}</span>
              </span>
              <Icon name="chevron" size={18} className="flip-rtl" />
            </button>
          ))}
        </div>

        <div className="hifz-pick">
          <select className="select" value={pick} onChange={(event) => setPick(Number(event.target.value))} aria-label={t('Surah')}>
            {meta.surahs.map((entry) => (
              <option key={entry.n} value={entry.n}>
                {entry.n}. {surahName(entry)}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-solid" onClick={() => choose([pick])}>
            {t('Memorise this surah')}
          </button>
        </div>
        {hifz.plan ? (
          <button type="button" className="btn btn-quiet btn-block" onClick={() => setEditing(false)}>
            {t('Keep my current plan')}
          </button>
        ) : null}
        <p className="reader-credit">{t('Changing the plan never deletes what you have already memorised.')}</p>
      </div>
    );
  }

  const queue = todayQueue(hifz, today, count);
  const nothing = queue.reviews.length === 0 && queue.fresh.length === 0;
  const learned = Object.keys(hifz.ayahs).length;

  return (
    <div className="hifz">
      <section className="hifz-today card">
        <p className="hifz-kicker">{t('Today')}</p>
        {nothing ? (
          <>
            <b className="hifz-big">{t('All done for today')}</b>
            <p className="muted">
              {queue.learnedInPlan >= queue.planSize
                ? t('Every ayah in this plan is memorised. Reviews will come back on their own.')
                : t('New ayahs come again tomorrow.')}
            </p>
          </>
        ) : (
          <>
            <b className="hifz-big">
              {[
                queue.reviews.length ? plural(queue.reviews.length, { one: 'Review {n}', other: 'Review {n}' }) : null,
                queue.fresh.length ? plural(queue.fresh.length, { one: '{n} new', other: '{n} new' }) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </b>
            <p className="muted">{t('About {n} min', { n: sessionMinutes(queue) })}</p>
            {queue.waiting ? <p className="muted">{t('{n} more reviews wait for another day — nothing is lost.', { n: queue.waiting })}</p> : null}
            <button type="button" className="btn btn-solid btn-block" onClick={onStart}>
              <Icon name="play" size={16} /> {t('Start')}
            </button>
          </>
        )}
      </section>

      <div className="hifz-legend">
        <span>
          <i className="hz-cell" /> {t('Not yet')}
        </span>
        <span>
          <i className="hz-cell is-sabaq" /> {t('New lesson')}
        </span>
        <span>
          <i className="hz-cell is-sabqi" /> {t('Recent review')}
        </span>
        <span>
          <i className="hz-cell is-manzil" /> {t('Long-term')}
        </span>
      </div>

      <p className="hifz-summary muted">
        {t('{learned} of {total} ayahs started in this plan · {all} memorised in all', {
          learned: queue.learnedInPlan,
          total: queue.planSize,
          all: learned,
        })}
      </p>

      <div className="hifz-map">
        {hifz.plan.surahs.map((s) => (
          <div key={s} className="hz-surah">
            <span className="hz-name">{surahName(meta.surahs[s - 1])}</span>
            <span className="hz-cells">
              {Array.from({ length: count(s) }, (_, i) => {
                const group = groupOf(hifz.ayahs[ayahKey(s, i + 1)], today);
                return <i key={i} className={`hz-cell${group ? ` is-${group}` : ''}`} title={`${s}:${i + 1}`} />;
              })}
            </span>
          </div>
        ))}
      </div>

      <div className="hifz-actions">
        <button type="button" className="btn btn-quiet" onClick={() => setEditing(true)}>
          {t('Change plan')}
        </button>
        <span className="muted">{t('{n} new a day', { n: hifz.plan.newPerDay })}</span>
      </div>
    </div>
  );
}
