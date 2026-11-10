import { useState } from 'react';
import { FAITH_OPTIONS, NEED_OPTIONS, neuroLabel, patchFor } from '../../domain/profile';
import { PRAYERS } from '../../domain/prayer-times';
import { actions, useStore } from '../../domain/store';
import type { AdaptKey, PrayerKey, ToneKey } from '../../domain/types';
import { useUi } from '../ui-context';
import { AdaptList, type AdaptValues } from './AdaptList';
import { Sheet } from './Sheet';

const fmtDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Settings → Comfort & support: every adaptation, why it is set that way, and
 * a control to reverse it. Nothing here is locked to a neurotype.
 */
export function ComfortSection() {
  const { settings } = useStore();
  const ui = useUi();
  const profile = settings.profile;
  const [confirm, setConfirm] = useState<'reset' | 'clear' | null>(null);
  const [guidePrayer, setGuidePrayer] = useState<PrayerKey>('asr');

  const values: AdaptValues = {
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

  const change = (key: AdaptKey, value: boolean | ToneKey) =>
    actions.setAdaptation(key, value as never);

  const summary = profile
    ? [
        profile.faith ? FAITH_OPTIONS.find((option) => option.id === profile.faith)?.label : null,
        profile.neuro.length ? neuroLabel(profile.neuro) : null,
        profile.needs.length
          ? `${profile.needs.length} thing${profile.needs.length === 1 ? '' : 's'} that get in the way`
          : null,
      ].filter(Boolean)
    : [];

  const steps = settings.ladderSteps;
  const setStep = (index: number, minutes: number) => {
    const next = [...steps];
    next[index] = minutes;
    actions.updateSettings({ ladderSteps: next.sort((a, b) => b - a) });
  };

  return (
    <section className="group comfort">
      <h2>Comfort &amp; support</h2>
      <div className="group-body">
        <div className="comfort-head">
          {profile ? (
            <>
              <p className="comfort-title">Adapted for you</p>
              <p className="comfort-sub">
                {summary.length ? summary.join(' · ') : 'Based on your answers'} · answered {fmtDate.format(profile.at)}
              </p>
              {profile.needs.length ? (
                <p className="comfort-needs">
                  {profile.needs.map((id) => NEED_OPTIONS.find((option) => option.id === id)?.label).join(' · ')}
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className="comfort-title">Make Niyyah fit you</p>
              <p className="comfort-sub">
                Three quick questions suggest the settings below, and say why. Or set them yourself.
              </p>
            </>
          )}
        </div>

        <label className="comfort-name" htmlFor="comfort-name">
          <span className="setting-label">Your name</span>
          <input
            id="comfort-name"
            className="input"
            type="text"
            autoComplete="given-name"
            maxLength={40}
            placeholder="Optional"
            value={settings.name}
            onChange={(event) => actions.updateSettings({ name: event.target.value })}
            onBlur={(event) => actions.updateSettings({ name: event.target.value.trim() })}
          />
        </label>

        <AdaptList
          values={values}
          applied={profile?.applied ?? null}
          overridden={profile?.overridden ?? []}
          onChange={change}
        />

        {settings.ladder ? (
          <div className="comfort-ladder">
            <p className="setting-label">Transition warning times</p>
            <div className="comfort-ladder-row">
              <label className="field">
                <span className="field-label">Wrap up</span>
                <select className="select" value={steps[0] ?? 20} onChange={(e) => setStep(0, Number(e.target.value))}>
                  {[15, 20, 30, 45, 60].map((m) => (
                    <option key={m} value={m}>
                      {m} min before
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">Wudu</span>
                <select className="select" value={steps[1] ?? 10} onChange={(e) => setStep(1, Number(e.target.value))}>
                  {[5, 10, 15].map((m) => (
                    <option key={m} value={m}>
                      {m} min before
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ) : null}

        {settings.learn ? (
          <div className="comfort-guides">
            <p className="setting-label">Step-by-step guides</p>
            <div className="comfort-guide-row">
              <button type="button" className="btn btn-quiet" onClick={() => ui.openGuide({ kind: 'wudu' })}>
                Wudu
              </button>
              <select
                className="select"
                aria-label="Prayer to learn"
                value={guidePrayer}
                onChange={(e) => setGuidePrayer(e.target.value as PrayerKey)}
              >
                {PRAYERS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() => ui.openGuide({ kind: 'prayer', prayer: guidePrayer })}
              >
                How to pray
              </button>
            </div>
          </div>
        ) : null}

        <div className="comfort-actions">
          <button type="button" className="btn btn-quiet" onClick={() => ui.openAboutYou()}>
            {profile ? 'Retake the questions' : 'Answer 3 quick questions'}
          </button>
          {profile ? (
            <>
              <button type="button" className="btn btn-quiet" onClick={() => setConfirm('reset')}>
                Reset to suggestions
              </button>
              <button type="button" className="btn btn-quiet" onClick={() => setConfirm('clear')}>
                Clear my answers
              </button>
            </>
          ) : null}
        </div>
      </div>

      <Sheet open={confirm !== null} onClose={() => setConfirm(null)} title="Are you sure?">
        <div className="sheet-head">
          <h2 className="sheet-title">{confirm === 'reset' ? 'Reset to suggestions?' : 'Clear your answers?'}</h2>
        </div>
        <p className="sheet-sub">
          {confirm === 'reset'
            ? 'Every setting above goes back to what your answers suggested, including ones you changed yourself.'
            : 'Your answers and the reasons are removed from this device. Your current settings stay exactly as they are.'}
        </p>
        <div className="comfort-confirm">
          <button type="button" className="btn btn-quiet" onClick={() => setConfirm(null)}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-solid"
            style={{ flex: 1 }}
            onClick={() => {
              if (confirm === 'reset' && profile) {
                actions.resetToSuggestions(patchFor(profile.applied, [], true));
                ui.toast('Back to your suggested settings');
              } else if (confirm === 'clear') {
                actions.clearProfile();
                ui.toast('Answers cleared. Settings unchanged.');
              }
              setConfirm(null);
            }}
          >
            {confirm === 'reset' ? 'Reset' : 'Clear answers'}
          </button>
        </div>
      </Sheet>
    </section>
  );
}
