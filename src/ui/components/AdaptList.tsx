import { ADAPTATIONS, TONE_OPTIONS } from '../../domain/profile';
import type { AdaptKey, Applied, ToneKey } from '../../domain/types';
import { t } from '../../i18n';
import { Segmented, Toggle } from './Controls';

export type AdaptValues = Record<AdaptKey, boolean | ToneKey>;

/**
 * One row per adaptation: what it does (in its current state), why it is set
 * that way, and a control to reverse it. Used right after onboarding and in
 * Settings → Comfort & support, so the two always read the same.
 */
export function AdaptList({
  values,
  applied,
  overridden,
  onChange,
  group,
}: {
  values: AdaptValues;
  applied: Applied[] | null;
  overridden: AdaptKey[];
  onChange: (key: AdaptKey, value: boolean | ToneKey) => void;
  /** Booleans suggested on / off, or just the tone row; omit for every row. */
  group?: 'on' | 'off' | 'tone';
}) {
  // Group by what was suggested, not the live value, so a row never jumps
  // between groups the moment it is toggled.
  const rows = ADAPTATIONS.filter((item) => {
    if (!group) return true;
    if (group === 'tone') return item.key === 'tone';
    if (item.key === 'tone') return false;
    const basis = applied?.find((entry) => entry.key === item.key)?.value ?? values[item.key];
    return group === 'on' ? basis === true : basis === false;
  });

  if (rows.length === 0) return <p className="adapt-empty muted">{t('Nothing here.')}</p>;

  return (
    <ul className="adapt-list">
      {rows.map((item) => {
        const value = values[item.key];
        const suggestion = applied?.find((entry) => entry.key === item.key);
        const reason = overridden.includes(item.key)
          ? t('Changed by you')
          : suggestion && suggestion.because.length
            ? t('Because you chose: {reasons}', { reasons: suggestion.because.map((reason) => t(reason)).join(' · ') })
            : suggestion
              ? t('Standard setting')
              : '';

        if (item.key === 'tone') {
          const tone = value as ToneKey;
          return (
            <li key={item.key} className="adapt-row adapt-stack">
              <div className="adapt-text">
                <b>{t(item.title)}</b>
                <span>{t(TONE_OPTIONS.find((option) => option.value === tone)?.hint ?? '')}</span>
                {reason ? <em className={overridden.includes(item.key) ? 'is-mine' : ''}>{reason}</em> : null}
              </div>
              <Segmented<ToneKey>
                value={tone}
                label={t('Tone of voice')}
                onChange={(next) => onChange('tone', next)}
                options={TONE_OPTIONS.map((option) => ({ value: option.value, label: t(option.label) }))}
              />
            </li>
          );
        }

        const on = value === true;
        return (
          <li key={item.key} className="adapt-row">
            <div className="adapt-text">
              <b>{t(item.title)}</b>
              <span>{t(on ? item.on : item.off)}</span>
              {reason ? <em className={overridden.includes(item.key) ? 'is-mine' : ''}>{reason}</em> : null}
            </div>
            <Toggle checked={on} onChange={(next) => onChange(item.key, next)} label={t(item.title)} />
          </li>
        );
      })}
    </ul>
  );
}
