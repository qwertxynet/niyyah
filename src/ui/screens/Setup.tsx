import { useState } from 'react';
import { METHODS } from '../../domain/prayer-times';
import { ensurePermission } from '../../domain/notify';
import { actions, useStore } from '../../domain/store';
import type { HighLatKey, MadhabKey, MethodKey, Settings } from '../../domain/types';
import { Segmented, Toggle } from '../components/Controls';
import { Icon } from '../components/Icons';
import { LocationPicker } from '../components/LocationPicker';
import { AboutYou } from './AboutYou';
import { t } from '../../i18n';
import { LanguageSwitch } from '../components/LanguageSwitch';

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
        skipLabel={t('Skip questions')}
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
          <Icon name="moon" size={17} /> {t('Niyyah')}
        </span>
        <div className="setup-top-end">
          <LanguageSwitch onChange={(language) => patch({ language })} />
          <div className="dots" aria-label={t('Step {n} of {total}', { n: step + 1, total: 4 })} role="status">
            {[0, 1, 2, 3].map((index) => (
              <i key={index} className={index === step ? 'is-active' : undefined} />
            ))}
          </div>
        </div>
      </div>

      <div className="setup-body fade-in" key={step}>
        {step === 0 ? (
          <>
            <h1>{t('Where are you praying from?')}</h1>
            <p className="lede">
              {t('Niyyah calculates every time on your device. Your location never leaves it, and the app works with no signal at all.')}
            </p>
            <LocationPicker value={draft.place} onChange={(place) => patch({ place })} />
          </>
        ) : null}

        {step === 1 ? (
          <>
            <h1>{t('Which calculation method?')}</h1>
            <p className="lede">
              {t('Schools differ by a degree or two, which can shift Fajr by a few minutes. Follow whatever your local mosque uses — you can change this later.')}
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
                    <b>{t(method.label)}</b>
                    <span>{t(method.hint)}</span>
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
            <h1>{t('Asr and long summer days')}</h1>
            <p className="lede">
              {t('The madhab decides when Asr begins. The high-latitude rule only matters in places where the sun barely sets.')}
            </p>
            <div className="field">
              <label>{t('Asr madhab')}</label>
              <Segmented<MadhabKey>
                value={draft.madhab}
                onChange={(madhab) => patch({ madhab })}
                label={t('Asr madhab')}
                options={[
                  { value: 'shafi', label: t('Shafi') },
                  { value: 'hanafi', label: t('Hanafi') },
                ]}
              />
            </div>
            <div className="field">
              <label htmlFor="highlat">{t('High latitude rule')}</label>
              <select
                id="highlat"
                className="select"
                value={draft.highLat}
                onChange={(event) => patch({ highLat: event.target.value as HighLatKey })}
              >
                {HIGH_LATITUDES.map((rule) => (
                  <option key={rule.value} value={rule.value}>
                    {t(rule.label)}
                  </option>
                ))}
              </select>
            </div>
            <div className="note">
              {t('Not sure? Leave it on middle of the night — it works well in northern Europe, Canada and the UK.')}
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <h1>{t('A gentle nudge?')}</h1>
            <p className="lede">
              {t('Niyyah can alert you at the adhan and warn you before a window closes. Nothing noisy, and you can turn it off any time.')}
            </p>
            <div className="card" style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
                <div>
                  <div className="setting-label">{t('Remind me')}</div>
                  <div className="setting-hint">{t('Adhan and pre-alert notifications.')}</div>
                </div>
                <Toggle
                  checked={draft.reminders}
                  onChange={(reminders) => patch({ reminders })}
                  label={t('Remind me')}
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
                      {t('Pre-alert')}
                    </label>
                    <select
                      id="prealert"
                      className="select"
                      value={String(draft.preAlert)}
                      onChange={(event) => patch({ preAlert: Number(event.target.value) })}
                    >
                      <option value="0">{t('Off — only at the adhan')}</option>
                      {[5, 10, 15, 20, 30].map((minutes) => (
                        <option key={minutes} value={minutes}>
                          {t('{n} minutes before', { n: minutes })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
                    <div>
                      <div className="setting-label">{t('Sound')}</div>
                      <div className="setting-hint">{t('Silent nudges if this is off.')}</div>
                    </div>
                    <Toggle checked={draft.sound} onChange={(sound) => patch({ sound })} label={t('Sound')} />
                  </div>
                </>
              ) : null}
            </div>
            <p className="setting-hint" style={{ marginTop: 14 }}>
              {draft.reminders
                ? t('Your device will ask for notification permission next. Niyyah asks once.')
                : t('You can switch reminders on later in Settings.')}
            </p>
          </>
        ) : null}
      </div>

      <div className="setup-foot">
        {step > 0 ? (
          <button type="button" className="btn btn-quiet" onClick={() => setStep(step - 1)} disabled={busy}>
            {t('Back')}
          </button>
        ) : (
          <button type="button" className="btn btn-quiet" onClick={() => setAboutDone(false)} disabled={busy}>
            {t('Back')}
          </button>
        )}
        {step > 0 && step < 3 ? (
          <button type="button" className="btn btn-quiet" onClick={() => setStep(3)} disabled={busy}>
            {t('Skip')}
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
            {t('Continue')} <Icon name="arrowRight" size={17} className="flip-rtl" />
          </button>
        ) : (
          <button type="button" className="btn btn-solid" style={{ flex: 1 }} onClick={finish} disabled={busy}>
            {busy ? t('Setting up…') : t('Start')}
          </button>
        )}
      </div>
    </div>
  );
}
