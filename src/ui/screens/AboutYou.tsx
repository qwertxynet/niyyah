import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FAITH_OPTIONS,
  NEED_OPTIONS,
  NEURO_OPTIONS,
  neuroLabel,
  recommend,
  suggestedNeeds,
} from '../../domain/profile';
import type { AdaptKey, FaithKey, NeedKey, NeuroKey, Profile, Settings, ToneKey } from '../../domain/types';
import { AdaptList, type AdaptValues } from '../components/AdaptList';
import { Icon } from '../components/Icons';
import { t } from '../../i18n';
import { LanguageSwitch } from '../components/LanguageSwitch';

const STEPS = 5;
const EXCLUSIVE: NeuroKey[] = ['neurotypical', 'unsure', 'unsaid'];

function valuesOf(settings: Settings): AdaptValues {
  return {
    calm: settings.calm,
    coarseTime: settings.coarseTime,
    literal: settings.literal,
    tone: settings.tone,
    ladder: settings.ladder,
    catchup: settings.catchup,
    sound: settings.sound,
    learn: settings.learn,
    hasanatTab: settings.hasanatTab,
  };
}

/**
 * Three short questions, then a plain list of everything Niyyah changed and
 * why, each reversible on the spot. Used in first setup, as a one-time prompt
 * for existing users, and from Settings ("Retake").
 */
export function AboutYou({
  settings,
  onComplete,
  onSkip,
  skipLabel,
}: {
  settings: Settings;
  onComplete: (profile: Profile, patch: Partial<Settings>) => void;
  onSkip: () => void;
  skipLabel?: string;
}) {
  const previous = settings.profile;
  const [step, setStep] = useState(0);
  const [name, setName] = useState(settings.name ?? '');
  const [faith, setFaith] = useState<FaithKey | null>(previous?.faith ?? null);
  const [neuro, setNeuro] = useState<NeuroKey[]>(previous?.neuro ?? []);
  const [needs, setNeeds] = useState<NeedKey[]>(previous?.needs ?? []);
  const [needsTouched, setNeedsTouched] = useState(Boolean(previous));
  // Adaptations the user has changed by hand — on a retake, carried over.
  const [overridden, setOverridden] = useState<AdaptKey[]>(previous?.overridden ?? []);
  const [values, setValues] = useState<AdaptValues>(() => valuesOf(settings));

  const applied = recommend({ faith, neuro, needs });

  function toggleNeuro(key: NeuroKey) {
    setNeuro((current) => {
      if (current.includes(key)) return current.filter((item) => item !== key);
      if (EXCLUSIVE.includes(key)) return [key];
      return [...current.filter((item) => !EXCLUSIVE.includes(item)), key];
    });
  }

  function toggleNeed(key: NeedKey) {
    setNeedsTouched(true);
    setNeeds((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  }

  function go(next: number) {
    if (next === 3 && !needsTouched) setNeeds(suggestedNeeds(neuro));
    if (next === 4) {
      // Fresh suggestions for everything the user has not changed by hand.
      setValues((current) => {
        const out = { ...current };
        for (const item of applied) if (!overridden.includes(item.key)) out[item.key] = item.value as never;
        return out;
      });
    }
    setStep(next);
    window.scrollTo(0, 0);
  }

  function change(key: AdaptKey, value: boolean | ToneKey) {
    setValues((current) => ({ ...current, [key]: value }));
    setOverridden((current) => (current.includes(key) ? current : [...current, key]));
  }

  function finish() {
    const profile: Profile = { faith, neuro, needs, at: Date.now(), applied, overridden };
    onComplete(profile, { ...values, name: name.trim().slice(0, 40) } as Partial<Settings>);
  }

  const turnedOn = applied.filter((item) => item.value === true && item.because.length > 0).length;

  return (
    <div className="setup about">
      <div className="setup-top">
        <span className="wordmark">
          <Icon name="moon" size={17} /> {t('Niyyah')}
        </span>
        <div className="setup-top-end">
          {settings.setupComplete ? null : <LanguageSwitch />}
          <div className="dots" aria-label={t('Step {n} of {total}', { n: step + 1, total: STEPS })} role="status">
            {Array.from({ length: STEPS }, (_, index) => (
              <i key={index} className={index === step ? 'is-active' : undefined} />
            ))}
          </div>
        </div>
      </div>

      <div className="setup-body fade-in" key={step}>
        {step === 0 ? (
          <>
            <p className="about-kicker">{t('Welcome')}</p>
            <h1>{t('What should Niyyah call you?')}</h1>
            <p className="lede">{t('Optional. A first name or nickname is plenty — it’s only used to greet you.')}</p>
            <label className="field" htmlFor="about-name">
              <span className="field-label">{t('Your name')}</span>
              <input
                id="about-name"
                className="input"
                type="text"
                autoComplete="given-name"
                autoCapitalize="words"
                maxLength={40}
                placeholder={t('e.g. Aisha')}
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') go(1);
                }}
              />
            </label>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <p className="about-kicker">{t('About you · {n} of 3', { n: 1 })}</p>
            <h1>{t('Where are you with Islam right now?')}</h1>
            <p className="lede">{t('There is no wrong answer. This only changes how much Niyyah explains.')}</p>
            <div className="option-list about-options">
              {FAITH_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="option"
                  aria-pressed={faith === option.id}
                  onClick={() => setFaith(option.id)}
                >
                  <span className="option-text">
                    <b>{t(option.label)}</b>
                    {option.hint ? <span>{t(option.hint)}</span> : null}
                  </span>
                  {faith === option.id ? (
                    <span className="option-mark">
                      <Icon name="check" size={18} strokeWidth={2.4} />
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <p className="about-kicker">{t('About you · {n} of 3', { n: 2 })}</p>
            <h1>{t('How does your mind work?')}</h1>
            <p className="lede">
              {t('Pick any that fit. A diagnosis isn’t needed. Autistic and ADHD together is often called AuDHD.')}
            </p>
            <div className="option-list about-options">
              {NEURO_OPTIONS.map((option) => {
                const on = neuro.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    className="option"
                    aria-pressed={on}
                    onClick={() => toggleNeuro(option.id)}
                  >
                    <span className="option-text">
                      <b>{t(option.label)}</b>
                      {option.hint ? <span>{t(option.hint)}</span> : null}
                    </span>
                    {on ? (
                      <span className="option-mark">
                        <Icon name="check" size={18} strokeWidth={2.4} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            {neuro.includes('autistic') && neuro.includes('adhd') ? (
              <p className="about-tag">{t('AuDHD — Niyyah was built with you in mind.')}</p>
            ) : null}
          </>
        ) : null}

        {step === 3 ? (
          <>
            <p className="about-kicker">{t('About you · {n} of 3', { n: 3 })}</p>
            <h1>{t('What gets in the way of praying?')}</h1>
            <p className="lede">
              {needsTouched || !neuro.some((key) => key === 'autistic' || key === 'adhd')
                ? t('Pick any that apply.')
                : t('We ticked a few that are common for {who}. Untick anything that isn’t you.', { who: neuroLabel(neuro) })}
            </p>
            <div className="chips" role="group" aria-label={t('What gets in the way')}>
              {NEED_OPTIONS.map((option) => {
                const on = needs.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    className="chip"
                    aria-pressed={on}
                    onClick={() => toggleNeed(option.id)}
                  >
                    {on ? <Icon name="check" size={15} strokeWidth={2.6} /> : null}
                    {t(option.label)}
                  </button>
                );
              })}
            </div>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <h1>{name.trim() ? t('Here’s how Niyyah adapted, {name}', { name: name.trim() }) : t('Here’s how Niyyah adapted')}</h1>
            <p className="lede">
              {turnedOn > 0
                ? t('Each change says why. Flip anything that doesn’t suit you — you can change all of it later in Settings → Comfort & support.')
                : t('Your answers didn’t call for changes, so Niyyah keeps its standard settings. You can still adjust anything here or later in Settings.')}
            </p>

            <h2 className="about-group">{t('Turned on')}</h2>
            <AdaptList values={values} applied={applied} overridden={overridden} onChange={change} group="on" />

            <h2 className="about-group">{t('Left off')}</h2>
            <AdaptList values={values} applied={applied} overridden={overridden} onChange={change} group="off" />

            <h2 className="about-group">{t('Voice')}</h2>
            <AdaptList values={values} applied={applied} overridden={overridden} onChange={change} group="tone" />
          </>
        ) : null}

        <p className="about-privacy">
          <Icon name="shield" size={15} />{' '}
          {t('Your answers stay on this device. They only change how the app looks and nudges.')}
        </p>
      </div>

      <div className="setup-foot">
        {step > 0 ? (
          <button type="button" className="btn btn-quiet" onClick={() => go(step - 1)}>
            {t('Back')}
          </button>
        ) : (
          <button type="button" className="btn btn-quiet" onClick={onSkip}>
            {skipLabel ?? t('Skip')}
          </button>
        )}
        {step < STEPS - 1 ? (
          <button type="button" className="btn btn-solid" style={{ flex: 1 }} onClick={() => go(step + 1)}>
            {(step === 0 && !name.trim()) || (step === 1 && !faith) || (step === 2 && neuro.length === 0)
              ? t('Skip this one')
              : t('Continue')}{' '}
            <Icon name="arrowRight" size={17} className="flip-rtl" />
          </button>
        ) : (
          <button type="button" className="btn btn-solid" style={{ flex: 1 }} onClick={finish}>
            {t('Looks good')}
          </button>
        )}
      </div>
    </div>
  );
}

/** The same questions as a full-screen layer over the app. */
export function AboutYouOverlay(props: Parameters<typeof AboutYou>[0]) {
  return createPortal(
    <div className="about-overlay" role="dialog" aria-modal="true" aria-label={t('About you')}>
      <AboutYou {...props} />
    </div>,
    document.body,
  );
}
