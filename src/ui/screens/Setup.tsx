import { useState } from 'react';
import { METHODS } from '../../domain/prayer-times';
import { ensurePermission } from '../../domain/notify';
import { actions, useStore } from '../../domain/store';
import type { HighLatKey, MadhabKey, MethodKey, Settings } from '../../domain/types';
import { Segmented, Toggle } from '../components/Controls';
import { Icon } from '../components/Icons';
import { LocationPicker } from '../components/LocationPicker';
import { AboutYou } from './AboutYou';

const HIGH_LATITUDES: { value: HighLatKey; label: string }[] = [
  { value: 'auto', label: 'Method default' },
  { value: 'middle', label: 'Middle of the night' },
  { value: 'seventh', label: 'One seventh of the night' },
  { value: 'angle', label: 'Twilight angle' },
];

export function Setup() {
  const { settings } = useStore();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Settings>(() => ({ ...settings }));
  const [busy, setBusy] = useState(false);
  // The "about you" questions come first, so later steps can reflect them.
  const [aboutDone, setAboutDone] = useState(Boolean(settings.profile));

  const patch = (next: Partial<Settings>) => setDraft((current) => ({ ...current, ...next }));
  const canContinue = step === 0 ? Boolean(draft.place) : true;

  async function finish() {
    setBusy(true);
    try {
      if (draft.reminders) {
        await ensurePermission();
      }
      actions.finishSetup(draft);
    } finally {
      setBusy(false);
    }
  }

  if (!aboutDone) {
    return (
      <AboutYou
        settings={draft}
        skipLabel="Skip questions"
        onSkip={() => {
          patch({ profileAsked: true });
          setAboutDone(true);
        }}
        onComplete={(profile, adapted) => {
          patch({ ...adapted, profile, profileAsked: true });
          setAboutDone(true);
        }}
      />
    );
  }

  return (
    <div className="setup">
      <div className="setup-top">
        <span className="wordmark">
          <Icon name="moon" size={17} /> Niyyah
        </span>
        <div className="dots" aria-label={`Step ${step + 1} of 4`} role="status">
          {[0, 1, 2, 3].map((index) => (
            <i key={index} className={index === step ? 'is-active' : undefined} />
          ))}
        </div>
      </div>

      <div className="setup-body fade-in" key={step}>
        {step === 0 ? (
          <>
            <h1>Where are you praying from?</h1>
            <p className="lede">
              Niyyah calculates every time on your device. Your location never leaves it, and the app
              works with no signal at all.
            </p>
            <LocationPicker value={draft.place} onChange={(place) => patch({ place })} />
          </>
        ) : null}

        {step === 1 ? (
          <>
            <h1>Which calculation method?</h1>
            <p className="lede">
              Schools differ by a degree or two, which can shift Fajr by a few minutes. Follow whatever
              your local mosque uses — you can change this later.
            </p>
            <div className="option-list">
              {METHODS.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  className="option"
                  aria-pressed={draft.method === method.id}
                  onClick={() => patch({ method: method.id as MethodKey })}
                >
                  <span className="option-text">
                    <b>{method.label}</b>
                    <span>{method.hint}</span>
                  </span>
                  {draft.method === method.id ? (
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
            <h1>Asr and long summer days</h1>
            <p className="lede">
              The madhab decides when Asr begins. The high-latitude rule only matters in places where
              the sun barely sets.
            </p>
            <div className="field">
              <label>Asr madhab</label>
              <Segmented<MadhabKey>
                value={draft.madhab}
                onChange={(madhab) => patch({ madhab })}
                label="Asr madhab"
                options={[
                  { value: 'shafi', label: 'Shafi' },
                  { value: 'hanafi', label: 'Hanafi' },
                ]}
              />
            </div>
            <div className="field">
              <label htmlFor="highlat">High latitude rule</label>
              <select
                id="highlat"
                className="select"
                value={draft.highLat}
                onChange={(event) => patch({ highLat: event.target.value as HighLatKey })}
              >
                {HIGH_LATITUDES.map((rule) => (
                  <option key={rule.value} value={rule.value}>
                    {rule.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="note">
              Not sure? Leave it on <b>middle of the night</b> — it works well in northern Europe,
              Canada and the UK.
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <h1>A gentle nudge?</h1>
            <p className="lede">
              Niyyah can alert you at the adhan and warn you before a window closes. Nothing noisy, and
              you can turn it off any time.
            </p>
            <div className="card" style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
                <div>
                  <div className="setting-label">Remind me</div>
                  <div className="setting-hint">Adhan and pre-alert notifications.</div>
                </div>
                <Toggle
                  checked={draft.reminders}
                  onChange={(reminders) => patch({ reminders })}
                  label="Remind me"
                />
              </div>
              {draft.reminders ? (
                <>
                  <div>
                    <label
                      htmlFor="prealert"
                      style={{
                        display: 'block',
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'var(--ink-3)',
                        marginBottom: 7,
                      }}
                    >
                      Pre-alert
                    </label>
                    <select
                      id="prealert"
                      className="select"
                      value={String(draft.preAlert)}
                      onChange={(event) => patch({ preAlert: Number(event.target.value) })}
                    >
                      <option value="0">Off — only at the adhan</option>
                      {[5, 10, 15, 20, 30].map((minutes) => (
                        <option key={minutes} value={minutes}>
                          {minutes} minutes before
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
                    <div>
                      <div className="setting-label">Sound</div>
                      <div className="setting-hint">Silent nudges if this is off.</div>
                    </div>
                    <Toggle checked={draft.sound} onChange={(sound) => patch({ sound })} label="Sound" />
                  </div>
                </>
              ) : null}
            </div>
            <p className="setting-hint" style={{ marginTop: 14 }}>
              {draft.reminders
                ? 'Your device will ask for notification permission next. Niyyah asks once.'
                : 'You can switch reminders on later in Settings.'}
            </p>
          </>
        ) : null}
      </div>

      <div className="setup-foot">
        {step > 0 ? (
          <button type="button" className="btn btn-quiet" onClick={() => setStep(step - 1)} disabled={busy}>
            Back
          </button>
        ) : (
          <button type="button" className="btn btn-quiet" onClick={() => setAboutDone(false)} disabled={busy}>
            Back
          </button>
        )}
        {step > 0 && step < 3 ? (
          <button type="button" className="btn btn-quiet" onClick={() => setStep(3)} disabled={busy}>
            Skip
          </button>
        ) : null}
        {step < 3 ? (
          <button
            type="button"
            className="btn btn-solid"
            style={{ flex: 1 }}
            disabled={!canContinue}
            onClick={() => setStep(step + 1)}
          >
            Continue <Icon name="arrowRight" size={17} />
          </button>
        ) : (
          <button type="button" className="btn btn-solid" style={{ flex: 1 }} onClick={finish} disabled={busy}>
            {busy ? 'Setting up…' : 'Start'}
          </button>
        )}
      </div>
    </div>
  );
}
