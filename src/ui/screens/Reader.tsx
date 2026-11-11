import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { fmtHasanat, rangeHasanat } from '../../domain/hasanat';
import { dateKey, placeCivilDate } from '../../domain/prayer-times';
import { surahName, useQuran, type QuranMeta, type Surah } from '../../domain/quran';
import {
  arabicNumber,
  BASMALAH,
  loadSurahText,
  QuranIntegrityError,
  saveWholeQuran,
  type SurahText,
} from '../../domain/quran-text';
import { actions, currentState, useStore } from '../../domain/store';
import { isArabic, plural, t } from '../../i18n';
import { Icon } from '../components/Icons';
import { useUi } from '../ui-context';
import { celebrate } from '../celebrate';

/** Where to open the reader: a surah (and ayah), or the surah list when empty. */
export interface ReaderTarget {
  s?: number;
  from?: number;
}

const SIZES = [1, 2, 3, 4, 5];

export function surahTitle(surah: Surah): string {
  return surahName(surah);
}

/** The Qur'an, Arabic only: a surah list, then the text with "I read up to here" tracking. */
export function Reader({ target, onClose }: { target: ReaderTarget; onClose: () => void }) {
  const meta = useQuran();
  const [open, setOpen] = useState<{ s: number; from: number } | null>(
    target.s ? { s: target.s, from: target.from ?? 1 } : null,
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return createPortal(
    <div className="reader" role="dialog" aria-modal="true" aria-label={t('The Qur’an')}>
      {!meta ? (
        <div className="reader-top">
          <span className="reader-title">{t('The Qur’an')}</span>
          <CloseButton onClose={onClose} />
        </div>
      ) : open ? (
        <SurahView
          key={`${open.s}:${open.from}`}
          meta={meta}
          n={open.s}
          from={open.from}
          onBack={() => setOpen(null)}
          onClose={onClose}
          onGo={(s, from) => setOpen({ s, from })}
        />
      ) : (
        <SurahIndex meta={meta} onClose={onClose} onOpen={(s, from) => setOpen({ s, from })} />
      )}
    </div>,
    document.body,
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" className="reader-icon-btn" onClick={onClose} aria-label={t('Close the reader')}>
      <Icon name="close" size={20} />
    </button>
  );
}

// ---------- the surah list ----------

function SurahIndex({
  meta,
  onClose,
  onOpen,
}: {
  meta: QuranMeta;
  onClose: () => void;
  onOpen: (s: number, from: number) => void;
}) {
  const { reading } = useStore();
  const [mode, setMode] = useState<'surah' | 'juz'>('surah');
  const [query, setQuery] = useState('');

  const resume = reading ? nextAfter(meta, reading.s, reading.a) : null;
  const q = query.trim().toLowerCase();
  const list = meta.surahs.filter(
    (s) => !q || String(s.n) === q || s.name.toLowerCase().includes(q) || s.en.toLowerCase().includes(q) || s.ar.includes(query.trim()),
  );

  return (
    <>
      <div className="reader-top">
        <span className="reader-title">
          {t('The Qur’an')} {isArabic() ? null : <span className="arabic">القرآن الكريم</span>}
        </span>
        <CloseButton onClose={onClose} />
      </div>

      <div className="reader-scroll">
        <div className="reader-index">
          {resume ? (
            <button type="button" className="reader-resume" onClick={() => onOpen(resume.s, resume.a)}>
              <span className="reader-resume-label">{t('Continue reading')}</span>
              <span className="reader-resume-where">
                {t('{surah}, ayah {n}', { surah: surahTitle(meta.surahs[resume.s - 1]), n: resume.a })}
              </span>
              <Icon name="chevron" size={18} className="flip-rtl" />
            </button>
          ) : null}

          <div className="reader-tabs" role="tablist" aria-label={t('Browse by')}>
            <button type="button" role="tab" aria-selected={mode === 'surah'} onClick={() => setMode('surah')}>
              {t('Surahs')}
            </button>
            <button type="button" role="tab" aria-selected={mode === 'juz'} onClick={() => setMode('juz')}>
              {t('Juz’')}
            </button>
          </div>

          {mode === 'surah' ? (
            <>
              <input
                className="input reader-search"
                type="search"
                value={query}
                placeholder={t('Find a surah by name or number')}
                aria-label={t('Find a surah by name or number')}
                onChange={(event) => setQuery(event.target.value)}
              />
              <ul className="reader-list">
                {list.map((s) => (
                  <li key={s.n}>
                    <button type="button" className="reader-row" onClick={() => onOpen(s.n, 1)}>
                      <span className="reader-num tnum">{s.n}</span>
                      <span className="reader-row-main">
                        <b>{isArabic() ? s.ar : s.name}</b>
                        <span>
                          {isArabic() ? '' : `${s.en} · `}
                          {plural(s.l.length, { one: '{n} ayah', other: '{n} ayahs' })}
                        </span>
                      </span>
                      {isArabic() ? null : <span className="reader-row-ar arabic">{s.ar}</span>}
                    </button>
                  </li>
                ))}
                {list.length === 0 ? <li className="muted reader-none">{t('No surah matches that.')}</li> : null}
              </ul>
            </>
          ) : (
            <ul className="reader-list">
              {meta.juz.map(([s, a], index) => (
                <li key={index}>
                  <button type="button" className="reader-row" onClick={() => onOpen(s, a)}>
                    <span className="reader-num tnum">{index + 1}</span>
                    <span className="reader-row-main">
                      <b>{t('Juz’ {n}', { n: index + 1 })}</b>
                      <span>{t('Starts at {surah} {n}', { surah: surahTitle(meta.surahs[s - 1]), n: a })}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <OfflineSave />

          <p className="reader-credit">
            {t('Text: Tanzil Project (tanzil.net), Uthmani, copied unchanged and checked before it is shown.')}
          </p>
        </div>
      </div>
    </>
  );
}

/** On the web build, offers to keep every surah for offline reading. The apps already bundle them. */
function OfflineSave() {
  const [done, setDone] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const web = typeof navigator !== 'undefined' && 'serviceWorker' in navigator && Boolean(navigator.serviceWorker.controller);
  if (!web) return null;
  if (done === 114) return <p className="reader-offline muted">{t('The whole Qur’an is saved on this device.')}</p>;
  return (
    <div className="reader-offline">
      <button
        type="button"
        className="btn btn-quiet"
        disabled={done !== null}
        onClick={() => {
          setFailed(false);
          setDone(0);
          saveWholeQuran(setDone).catch(() => {
            setFailed(true);
            setDone(null);
          });
        }}
      >
        <Icon name="download" size={16} />
        {done === null ? t('Save the whole Qur’an for offline reading (1.5 MB)') : t('Saving… {n} of 114', { n: done })}
      </button>
      {failed ? <p className="muted">{t('Could not reach the server. Surahs you have opened still work offline.')}</p> : null}
    </div>
  );
}

function nextAfter(meta: QuranMeta, s: number, a: number): { s: number; a: number } {
  const count = meta.surahs[s - 1]?.l.length ?? 0;
  if (a < count) return { s, a: a + 1 };
  return s < 114 ? { s: s + 1, a: 1 } : { s: 1, a: 1 };
}

// ---------- one surah ----------

type Load = { status: 'loading' } | { status: 'ready'; text: SurahText } | { status: 'error'; integrity: boolean };

function useSurahText(n: number): [Load, () => void] {
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoad({ status: 'loading' });
    loadSurahText(n)
      .then((text) => alive && setLoad({ status: 'ready', text }))
      .catch((error) => alive && setLoad({ status: 'error', integrity: error instanceof QuranIntegrityError }));
    return () => {
      alive = false;
    };
  }, [n, attempt]);
  return [load, () => setAttempt((value) => value + 1)];
}

function SurahView({
  meta,
  n,
  from,
  onBack,
  onClose,
  onGo,
}: {
  meta: QuranMeta;
  n: number;
  from: number;
  onBack: () => void;
  onClose: () => void;
  onGo: (s: number, from: number) => void;
}) {
  const { settings } = useStore();
  const ui = useUi();
  const surah = meta.surahs[n - 1];
  const count = surah.l.length;
  const [load, retry] = useSurahText(n);

  const [start, setStart] = useState(Math.min(Math.max(1, from), count));
  const [end, setEnd] = useState<number | null>(null);
  const [focusAt, setFocusAt] = useState(Math.min(Math.max(1, from), count));
  const [savedTo, setSavedTo] = useState(0);
  const focus = settings.quranFocus;
  const size = SIZES.includes(settings.quranSize) ? settings.quranSize : 3;

  // In focus mode the ayah on screen is how far you have read.
  const to = focus ? focusAt : end;
  const estimate = to !== null && to >= start ? rangeHasanat(meta, n, start, to) : null;

  const scrolled = useRef(false);
  useEffect(() => {
    if (load.status !== 'ready' || focus || scrolled.current) return;
    scrolled.current = true;
    if (from > 1) document.getElementById(`ayah-${n}-${from}`)?.scrollIntoView({ block: 'center' });
  }, [load.status, focus, from, n]);

  function tap(ayah: number) {
    if (ayah < start) {
      setStart(ayah);
      if (end !== null && end < ayah) setEnd(null);
    } else setEnd(ayah === end ? null : ayah);
  }

  function save(button?: Element) {
    if (to === null || estimate === null) return;
    celebrate(button, { count: 14, label: `+${fmtHasanat(estimate)}` });
    const previous = currentState().reading;
    const key = dateKey(placeCivilDate(new Date(), settings));
    const label = start === to ? `${surahName(surah)} ${start}` : `${surahName(surah)} ${start}–${to}`;
    const id = actions.addDeed(key, { rule: 'reader', label, h: Math.round(estimate), q: { s: n, from: start, to } });
    actions.setReading({ s: n, a: to, at: Date.now() });
    const savedStart = start;
    ui.toast(t('{what} · ≈ +{h} hasanat', { what: label, h: fmtHasanat(estimate) }), () => {
      actions.removeDeed(key, id);
      actions.setReading(previous);
      setStart(savedStart);
      setSavedTo(0);
    });
    setSavedTo(to);
    if (to < count) {
      setStart(to + 1);
      setFocusAt(to + 1);
    }
    setEnd(null);
  }

  const finished = savedTo === count;
  const next = n < 114 ? meta.surahs[n] : null;

  return (
    <>
      <div className="reader-top">
        <button type="button" className="reader-icon-btn" onClick={onBack} aria-label={t('All surahs')}>
          <Icon name="chevron" size={20} className="flip" />
        </button>
        <span className="reader-title reader-title-surah">
          <span className="arabic">{surah.ar}</span>
          {isArabic() ? null : <small>{surah.name}</small>}
        </span>
        <TextSize size={size} />
        <button
          type="button"
          className="reader-icon-btn"
          aria-pressed={focus}
          onClick={() => actions.updateSettings({ quranFocus: !focus })}
          aria-label={focus ? t('Show the whole surah') : t('One ayah at a time')}
          title={focus ? t('Show the whole surah') : t('One ayah at a time')}
        >
          <Icon name={focus ? 'rows' : 'focus'} size={18} />
        </button>
        <CloseButton onClose={onClose} />
      </div>

      <div className="reader-scroll">
        {load.status === 'loading' ? (
          <p className="reader-status muted">{t('Opening…')}</p>
        ) : load.status === 'error' ? (
          <div className="reader-status">
            <p>
              {load.integrity
                ? t('This surah’s text did not pass its check, so it is not shown. Try again, or reinstall the app.')
                : t('Could not open this surah. If you are offline, it has not been saved on this device yet.')}
            </p>
            <button type="button" className="btn btn-quiet" onClick={retry}>
              {t('Try again')}
            </button>
          </div>
        ) : focus ? (
          <FocusView
            text={load.text}
            at={focusAt}
            start={start}
            size={size}
            onMove={(ayah) => setFocusAt(Math.min(count, Math.max(1, ayah)))}
          />
        ) : (
          <div className={`mushaf size-${size}`} lang="ar" dir="rtl">
            <p className="mushaf-meta">
              {surah.ar} · <bdi>{plural(count, { one: '{n} ayah', other: '{n} ayahs' })}</bdi>
            </p>
            {load.text.basmalah ? <p className="mushaf-basmalah">{BASMALAH}</p> : null}
            <p className="mushaf-text">
              {load.text.ayahs.map((ayah, index) => {
                const number = index + 1;
                const inRange = to !== null && number >= start && number <= to;
                const read = number <= savedTo;
                const isStart = number === start && to === null && start > 1;
                return (
                  <span key={number}>
                    {isStart ? (
                      <span className="ayah-start" aria-hidden="true">
                        ◆
                      </span>
                    ) : null}
                    <span
                      id={`ayah-${n}-${number}`}
                      role="button"
                      tabIndex={0}
                      className={`ayah${inRange ? ' is-range' : ''}${read ? ' is-read' : ''}`}
                      onClick={() => tap(number)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          tap(number);
                        }
                      }}
                      aria-label={t('Ayah {n}', { n: number })}
                    >
                      {ayah}
                    </span>{' '}
                    <span className="ayah-mark" aria-hidden="true">
                      ﴿{arabicNumber(number)}﴾
                    </span>{' '}
                  </span>
                );
              })}
            </p>
            {next ? (
              <button type="button" className="btn btn-quiet mushaf-next" onClick={() => onGo(next.n, 1)} dir="auto">
                {t('Next: {surah}', { surah: surahTitle(next) })}
              </button>
            ) : null}
          </div>
        )}
      </div>

      {load.status === 'ready' ? (
        <div className="reader-dock" aria-live="polite">
          {finished ? (
            <>
              <p className="reader-dock-text">
                <b>{t('You finished {surah}.', { surah: surahTitle(surah) })}</b>
                <span>{t('May Allah accept it from you.')}</span>
              </p>
              {next ? (
                <button type="button" className="btn btn-solid" onClick={() => onGo(next.n, 1)}>
                  {t('Next surah')}
                </button>
              ) : null}
            </>
          ) : estimate !== null && to !== null ? (
            <>
              <p className="reader-dock-text">
                <b>{start === to ? t('Ayah {n}', { n: start }) : t('Ayahs {from}–{to}', { from: start, to })}</b>
                <span className="tnum">{t('≈ +{h} hasanat', { h: fmtHasanat(estimate) })}</span>
              </p>
              <button type="button" className="btn btn-solid" onClick={(event) => save(event.currentTarget)}>
                <Icon name="check" size={16} /> {t('I read these')}
              </button>
            </>
          ) : (
            <p className="reader-dock-hint">
              {start > 1
                ? t('Starting at ayah {n}. Tap the last ayah you read.', { n: start })
                : t('Tap the last ayah you read to add it to your hasanat.')}
            </p>
          )}
        </div>
      ) : null}
    </>
  );
}

function TextSize({ size }: { size: number }) {
  // One button that steps through five sizes, so the header stays uncluttered.
  return (
    <button
      type="button"
      className="reader-icon-btn"
      onClick={() => actions.updateSettings({ quranSize: size >= 5 ? 1 : size + 1 })}
      aria-label={t('Text size {n} of 5. Tap for the next size.', { n: size })}
      title={t('Text size')}
    >
      <span className="reader-a">
        A<small>a</small>
      </span>
      <span className="reader-size-dots" aria-hidden="true">
        {SIZES.map((value) => (
          <i key={value} className={value <= size ? 'on' : ''} />
        ))}
      </span>
    </button>
  );
}

function FocusView({
  text,
  at,
  start,
  size,
  onMove,
}: {
  text: SurahText;
  at: number;
  start: number;
  size: number;
  onMove: (ayah: number) => void;
}) {
  const count = text.ayahs.length;
  const progress = useMemo(() => (at / count) * 100, [at, count]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // In the mushaf, the next ayah is to the left.
      if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') onMove(at + 1);
      if (event.key === 'ArrowRight' || event.key === 'ArrowUp') onMove(at - 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [at, onMove]);

  return (
    <div className="focus-reader">
      <div className="guide-progress" aria-hidden="true">
        <i style={{ width: `${progress}%` }} />
      </div>
      <p className="focus-where">
        {t('Ayah {n} of {total}', { n: at, total: count })}
        {at > start ? ` · ${t('reading from {n}', { n: start })}` : ''}
      </p>
      {at === 1 && text.basmalah ? (
        <p className="mushaf-basmalah" lang="ar" dir="rtl">
          {BASMALAH}
        </p>
      ) : null}
      <p className={`focus-ayah size-${size}`} lang="ar" dir="rtl" key={at}>
        {text.ayahs[at - 1]}{' '}
        <span className="ayah-mark" aria-hidden="true">
          ﴿{arabicNumber(at)}﴾
        </span>
      </p>
      <div className="focus-nav">
        <button type="button" className="btn btn-quiet" disabled={at <= 1} onClick={() => onMove(at - 1)}>
          {t('Previous')}
        </button>
        <button type="button" className="btn btn-solid" disabled={at >= count} onClick={() => onMove(at + 1)}>
          {t('Next ayah')}
        </button>
      </div>
    </div>
  );
}
