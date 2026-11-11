import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { fmtHasanat, rangeHasanat } from '../../domain/hasanat';
import { ayahKey, fadeWords, todayQueue, type Group, type Rating } from '../../domain/hifz';
import { isActive, play, stop as stopPlayer, usePlayer } from '../../domain/player';
import { arabicNumber, loadSurahText, type SurahText } from '../../domain/quran-text';
import { surahName, type QuranMeta } from '../../domain/quran';
import { actions, useStore } from '../../domain/store';
import { t } from '../../i18n';
import { celebrate } from '../celebrate';
import { AudioDownloadSheet } from '../components/AudioDownloadSheet';
import { Icon } from '../components/Icons';
import { useToday } from './Memorise';

type StepKind = 'listen' | 'fade1' | 'fade2' | 'memory' | 'link';

interface Step {
  s: number;
  a: number;
  kind: StepKind;
  group: Group;
}

/** New ayahs get the full walk-through; reviews go straight to reciting from memory. */
function buildSteps(reviews: { s: number; a: number; group: Group }[], fresh: { s: number; a: number }[], linkable: (s: number, a: number) => boolean): Step[] {
  const steps: Step[] = [];
  for (const item of reviews) steps.push({ ...item, kind: 'memory' });
  for (const item of fresh) {
    for (const kind of ['listen', 'fade1', 'fade2', 'memory'] as StepKind[]) steps.push({ ...item, kind, group: 'sabaq' });
    const learnedJustBefore = fresh.some((other) => other.s === item.s && other.a === item.a - 1);
    if (linkable(item.s, item.a) || learnedJustBefore) steps.push({ ...item, kind: 'link', group: 'sabaq' });
  }
  return steps;
}

const GROUP_LABEL: Record<Group, string> = {
  sabaq: 'New lesson',
  sabqi: 'Recent review',
  manzil: 'Long-term review',
};

/**
 * Today's memorisation, one calm step per screen: listen, fade the words,
 * recite from memory and say how it went, then join it to the ayah before.
 */
export function MemoriseSession({ meta, onClose }: { meta: QuranMeta; onClose: () => void }) {
  const { hifz, settings } = useStore();
  const today = useToday();
  const count = (s: number) => meta.surahs[s - 1]?.l.length ?? 0;

  // The list is fixed when the session opens, so rating doesn't reshuffle it.
  const [steps] = useState<Step[]>(() => {
    const queue = todayQueue(hifz, today, count);
    return buildSteps(queue.reviews, queue.fresh, (s, a) => a > 1 && Boolean(hifz.ayahs[ayahKey(s, a - 1)]));
  });
  const [index, setIndex] = useState(0);
  const [texts, setTexts] = useState<Record<number, SurahText>>({});
  const [recited, setRecited] = useState<{ s: number; a: number }[]>([]);
  const [savedHasanat, setSavedHasanat] = useState(false);
  const step = steps[index] as Step | undefined;
  const done = index >= steps.length;

  useEffect(() => {
    const surahs = new Set(steps.map((item) => item.s));
    for (const s of surahs) {
      loadSurahText(s)
        .then((text) => setTexts((current) => ({ ...current, [s]: text })))
        .catch(() => undefined);
    }
  }, [steps]);

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
      stopPlayer();
    };
  }, [onClose]);

  function go(next: number) {
    stopPlayer();
    setIndex(next);
  }

  function rateStep(rating: Rating, button: Element) {
    if (!step) return;
    actions.rateAyah(step.s, step.a, today, rating);
    setRecited((list) => [...list, { s: step.s, a: step.a }]);
    if (rating === 'smooth') celebrate(button, { count: 8 });
    go(index + 1);
  }

  const total = steps.length;
  const progress = total ? Math.min(100, (index / total) * 100) : 100;
  const text = step ? texts[step.s] : undefined;

  return createPortal(
    <div className="guide hifz-session" role="dialog" aria-modal="true" aria-label={t('Memorise')}>
      <div className="guide-top">
        <span className="guide-title">{t('Memorise')}</span>
        <button type="button" className="guide-close" onClick={onClose} aria-label={t('Close')}>
          <Icon name="close" size={20} />
        </button>
      </div>
      <div className="guide-progress" aria-hidden="true">
        <i style={{ width: `${progress}%` }} />
      </div>

      {done ? (
        <Summary
          meta={meta}
          recited={recited}
          saved={savedHasanat}
          onSave={(button) => {
            const byAyah = recited.reduce((sum, item) => sum + rangeHasanat(meta, item.s, item.a, item.a), 0);
            if (!byAyah) return;
            actions.addDeed(today, {
              rule: 'hifz',
              label: t('Memorisation · {n} ayahs', { n: recited.length }),
              h: Math.round(byAyah),
            });
            celebrate(button, { count: 16, label: `+${fmtHasanat(byAyah)}` });
            setSavedHasanat(true);
          }}
          onClose={onClose}
        />
      ) : step ? (
        <div className="guide-body" key={index}>
          <p className="guide-section">
            {t(GROUP_LABEL[step.group])} · {surahName(meta.surahs[step.s - 1])} {step.a} ·{' '}
            {t('step {n} of {total}', { n: index + 1, total })}
          </p>
          {!text ? (
            <p className="muted">{t('Opening…')}</p>
          ) : (
            <StepBody
              key={`${index}`}
              step={step}
              text={text}
              reciter={settings.reciter}
              title={surahName(meta.surahs[step.s - 1])}
              onRate={rateStep}
            />
          )}
        </div>
      ) : (
        <div className="guide-body">
          <p>{t('Nothing to practise right now.')}</p>
        </div>
      )}

      {!done && step && step.kind !== 'memory' ? (
        <div className="guide-foot">
          <button type="button" className="btn btn-quiet" onClick={() => go(Math.max(0, index - 1))} disabled={index === 0}>
            {t('Back')}
          </button>
          <button type="button" className="btn btn-solid" style={{ flex: 1 }} onClick={() => go(index + 1)}>
            {t('Next')} <Icon name="arrowRight" size={17} className="flip-rtl" />
          </button>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}

function StepBody({
  step,
  text,
  reciter,
  title,
  onRate,
}: {
  step: Step;
  text: SurahText;
  reciter: import('../../domain/reciters').ReciterId;
  title: string;
  onRate: (rating: Rating, button: Element) => void;
}) {
  const ayah = text.ayahs[step.a - 1] ?? '';
  const player = usePlayer();
  const [missing, setMissing] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [aloud, setAloud] = useState(0);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const listening = isActive(player) && player.queue[player.index]?.s === step.s && player.queue[player.index]?.a === step.a;
  const auto = useRef(false);

  async function listen(times: number) {
    const outcome = await play([{ s: step.s, a: step.a }], { reciter, repeat: times, gap: 'match', title });
    if (outcome === 'missing') setMissing(true);
  }

  // The listening step starts playing by itself — the user pressed Next to get here.
  useEffect(() => {
    if (step.kind === 'listen' && !auto.current) {
      auto.current = true;
      void listen(3);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.kind]);

  const level = step.kind === 'fade1' ? 1 : step.kind === 'fade2' ? 2 : step.kind === 'memory' ? 3 : 0;
  const words = useMemo(() => fadeWords(ayah, level as 0 | 1 | 2 | 3), [ayah, level]);

  const heading: Record<StepKind, string> = {
    listen: 'Listen and read along',
    fade1: 'Some words fade',
    fade2: 'Only first letters',
    memory: 'Recite from memory',
    link: 'Join it to the ayah before',
  };
  const help: Record<StepKind, string> = {
    listen: 'Follow the words as it plays. Say it along under your breath.',
    fade1: 'Recite the whole ayah. Tap a gap if you need the word.',
    fade2: 'Each word shows only its first letter. Recite it all.',
    memory: 'Say it from memory, then check. Tap any dot to peek at a word.',
    link: 'Recite the end of the ayah before, then carry straight on into this one.',
  };

  const previousAyah = step.kind === 'link' ? text.ayahs[step.a - 2] ?? '' : '';

  return (
    <>
      <h2 className="guide-step">{t(heading[step.kind])}</h2>
      <p className="guide-text">{t(help[step.kind])}</p>

      {step.kind === 'link' ? (
        <p className="hifz-ayah is-faint" lang="ar" dir="rtl">
          … {previousAyah.split(' ').slice(-4).join(' ')} <span className="ayah-mark">﴿{arabicNumber(step.a - 1)}﴾</span>
        </p>
      ) : null}

      <p className={`hifz-ayah size-${3}`} lang="ar" dir="rtl">
        {step.kind === 'listen' || step.kind === 'link' || showAll
          ? ayah
          : words.map((word, i) =>
              word.hidden && !revealed.has(i) ? (
                <button
                  key={i}
                  type="button"
                  className={word.hint ? 'hz-word is-hint' : 'hz-word'}
                  onClick={() => setRevealed((set) => new Set(set).add(i))}
                  aria-label={t('Show this word')}
                >
                  {word.hint || '•••'}
                </button>
              ) : (
                <span key={i} className={revealed.has(i) ? 'hz-shown is-peeked' : 'hz-shown'}>
                  {word.word}
                </span>
              ),
            )}{' '}
        <span className="ayah-mark">﴿{arabicNumber(step.a)}﴾</span>
      </p>

      <div className="hifz-tools">
        {missing ? (
          <div className="hifz-aloud">
            <p className="muted">{t('No recitation on this device for this surah. Read it aloud three times instead.')}</p>
            <button type="button" className="btn btn-quiet" onClick={() => setAloud((n) => Math.min(3, n + 1))}>
              {t('Read aloud · {n} of 3', { n: aloud })}
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => setDownloadOpen(true)}>
              <Icon name="download" size={15} /> {t('Download recitation')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => (listening ? stopPlayer() : void listen(step.kind === 'listen' ? 3 : 1))}
          >
            <Icon name={listening ? 'pause' : 'headphones'} size={16} />{' '}
            {listening
              ? player.repeat > 1
                ? t('Playing · {rep} of {total}', { rep: player.rep, total: player.repeat })
                : t('Playing')
              : step.kind === 'listen'
                ? t('Listen 3 times')
                : t('Listen once')}
          </button>
        )}
      </div>

      {step.kind === 'memory' ? (
        showAll ? (
          <div className="hifz-rate" role="group" aria-label={t('How did it go?')}>
            <p className="field-label">{t('How did it go?')}</p>
            <button type="button" className="btn btn-solid" onClick={(e) => onRate('smooth', e.currentTarget)}>
              {t('Smooth')}
            </button>
            <button type="button" className="btn btn-quiet" onClick={(e) => onRate('slips', e.currentTarget)}>
              {t('A few slips')}
            </button>
            <button type="button" className="btn btn-quiet" onClick={(e) => onRate('help', e.currentTarget)}>
              {t('Needed help')}
            </button>
            <p className="setting-hint">{t('“Needed help” just brings it back tomorrow. Nothing is lost.')}</p>
          </div>
        ) : (
          <button type="button" className="btn btn-solid btn-block hifz-check" onClick={() => setShowAll(true)}>
            {t('I’ve recited it — show me')}
          </button>
        )
      ) : null}

      <AudioDownloadSheet
        surahs={downloadOpen ? [step.s] : []}
        onClose={() => setDownloadOpen(false)}
        onDone={() => {
          setDownloadOpen(false);
          setMissing(false);
          void listen(step.kind === 'listen' ? 3 : 1);
        }}
      />
    </>
  );
}

function Summary({
  meta,
  recited,
  saved,
  onSave,
  onClose,
}: {
  meta: QuranMeta;
  recited: { s: number; a: number }[];
  saved: boolean;
  onSave: (button: Element) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (recited.length) celebrate(ref.current, { count: 20 });
  }, [recited.length]);
  const hasanat = recited.reduce((sum, item) => sum + rangeHasanat(meta, item.s, item.a, item.a), 0);

  return (
    <div className="guide-body hifz-done">
      <div className="tapper-arabic" aria-hidden="true">
        بَارَكَ ٱللَّٰهُ فِيكَ
      </div>
      <h2 className="guide-step" ref={ref}>
        {recited.length ? t('That’s today done') : t('Nothing to practise right now')}
      </h2>
      <p className="guide-text">
        {recited.length
          ? t('You recited {n} ayahs from memory. They’ll come back for review at the right time.', { n: recited.length })
          : t('New ayahs come again tomorrow.')}
      </p>
      {recited.length ? (
        <button type="button" className="btn btn-quiet btn-block" disabled={saved} onClick={(e) => onSave(e.currentTarget)}>
          {saved ? t('Added to your hasanat') : t('Add this recitation to hasanat · ≈ +{h}', { h: fmtHasanat(hasanat) })}
        </button>
      ) : null}
      <button type="button" className="btn btn-solid btn-block" onClick={onClose} style={{ marginTop: 10 }}>
        {t('Done')}
      </button>
    </div>
  );
}
