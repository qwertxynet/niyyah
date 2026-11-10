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

const STEPS = 4;
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
  skipLabel = 'Skip',
}: {
  settings: Settings;
  onComplete: (profile: Profile, patch: Partial<Settings>) => void;
  onSkip: () => void;
  skipLabel?: string;
}) {
  const previous = settings.profile;
  const [step, setStep] = useState(0);
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
    if (next === 2 && !needsTouched) setNeeds(suggestedNeeds(neuro));
    if (next === 3) {
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
    onComplete(profile, { ...values } as Partial<Settings>);
  }

  const turnedOn = applied.filter((item) => item.value === true && item.because.length > 0).length;

  return (
    <div className="setup about">
      <div className="setup-top">
        <span className="wordmark">
          <Icon name="moon" size={17} /> Niyyah
        </span>
        <div className="dots" aria-label={`Question ${step + 1} of ${STEPS}`} role="status">
          {Array.from({ length: STEPS }, (_, index) => (
            <i key={index} className={index === step ? 'is-active' : undefined} />
          ))}
        </div>
      </div>

      <div className="setup-body fade-in" key={step}>
        {step === 0 ? (
          <>
            <p className="about-kicker">About you · 1 of 3</p>
            <h1>Where are you with Islam right now?</h1>
            <p className="lede">There is no wrong answer. This only changes how much Niyyah explains.</p>
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
                    <b>{option.label}</b>
                    {option.hint ? <span>{option.hint}</span> : null}
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

        {step === 1 ? (
          <>
            <p className="about-kicker">About you · 2 of 3</p>
            <h1>How does your mind work?</h1>
            <p className="lede">
              Pick any that fit. A diagnosis isn&apos;t needed. Autistic and ADHD together is often called AuDHD.
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
                      <b>{option.label}</b>
                      {option.hint ? <span>{option.hint}</span> : null}
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
              <p className="about-tag">AuDHD — Niyyah was built with you in mind.</p>
            ) : null}
          </>
        ) : null}

        {step === 2 ? (
          <>
            <p className="about-kicker">About you · 3 of 3</p>
            <h1>What gets in the way of praying?</h1>
            <p className="lede">
              {needsTouched || !neuro.some((key) => key === 'autistic' || key === 'adhd')
                ? 'Pick any that apply.'
                : `We ticked a few that are common for ${neuroLabel(neuro)}. Untick anything that isn't you.`}
            </p>
            <div className="chips" role="group" aria-label="What gets in the way">
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
                    {option.label}
                  </button>
                );
              })}
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <h1>Here&apos;s how Niyyah adapted</h1>
            <p className="lede">
              {turnedOn > 0
                ? 'Each change says why. Flip anything that doesn’t suit you — you can change all of it later in Settings → Comfort & support.'
                : 'Your answers didn’t call for changes, so Niyyah keeps its standard settings. You can still adjust anything here or later in Settings.'}
            </p>

            <h2 className="about-group">Turned on</h2>
            <AdaptList values={values} applied={applied} overridden={overridden} onChange={change} group="on" />

            <h2 className="about-group">Left off</h2>
            <AdaptList values={values} applied={applied} overridden={overridden} onChange={change} group="off" />

            <h2 className="about-group">Voice</h2>
            <AdaptList values={values} applied={applied} overridden={overridden} onChange={change} group="tone" />
          </>
        ) : null}

        <p className="about-privacy">
          <Icon name="shield" size={15} /> Your answers stay on this device. They only change how the app looks and
          nudges.
        </p>
      </div>

      <div className="setup-foot">
        {step > 0 ? (
          <button type="button" className="btn btn-quiet" onClick={() => go(step - 1)}>
            Back
          </button>
        ) : (
          <button type="button" className="btn btn-quiet" onClick={onSkip}>
            {skipLabel}
          </button>
        )}
        {step < STEPS - 1 ? (
          <button type="button" className="btn btn-solid" style={{ flex: 1 }} onClick={() => go(step + 1)}>
            {(step === 0 && !faith) || (step === 1 && neuro.length === 0) ? 'Skip this one' : 'Continue'}{' '}
            <Icon name="arrowRight" size={17} />
          </button>
        ) : (
          <button type="button" className="btn btn-solid" style={{ flex: 1 }} onClick={finish}>
            Looks good
          </button>
        )}
      </div>
    </div>
  );
}

/** The same questions as a full-screen layer over the app. */
export function AboutYouOverlay(props: Parameters<typeof AboutYou>[0]) {
  return createPortal(
    <div className="about-overlay" role="dialog" aria-modal="true" aria-label="About you">
      <AboutYou {...props} />
    </div>,
    document.body,
  );
}
