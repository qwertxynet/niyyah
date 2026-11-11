import type { QuranMeta } from '../../domain/quran';
import { isArabic, t } from '../../i18n';
import { surahName } from '../../domain/quran';

/** Surah + ayah range. Defaults to the whole surah; clamps as you type. */
export interface VerseRange {
  s: number;
  from: number;
  to: number;
}

export function VersePicker({
  meta,
  value,
  onChange,
  idPrefix,
}: {
  meta: QuranMeta;
  value: VerseRange;
  onChange: (next: VerseRange) => void;
  idPrefix: string;
}) {
  const surah = meta.surahs[value.s - 1];
  const max = surah?.l.length ?? 1;

  const clamp = (n: number) => Math.max(1, Math.min(max, Math.round(Number.isFinite(n) ? n : 1)));

  return (
    <div className="verse-picker">
      <label className="field">
        <span className="field-label">{t('Surah')}</span>
        <select
          className="select"
          value={value.s}
          onChange={(event) => {
            const s = Number(event.target.value);
            onChange({ s, from: 1, to: meta.surahs[s - 1]?.l.length ?? 1 });
          }}
        >
          {meta.surahs.map((entry) => (
            <option key={entry.n} value={entry.n}>
              {isArabic() ? `${entry.n}. ${entry.ar}` : `${entry.n}. ${entry.name} · ${entry.ar}`}
            </option>
          ))}
        </select>
      </label>
      <div className="verse-range">
        <label className="field" htmlFor={`${idPrefix}-from`}>
          <span className="field-label">{t('From ayah')}</span>
          <input
            id={`${idPrefix}-from`}
            className="input tnum"
            type="number"
            inputMode="numeric"
            min={1}
            max={max}
            value={value.from}
            onChange={(event) => {
              const from = clamp(Number(event.target.value));
              onChange({ ...value, from, to: Math.max(from, value.to) });
            }}
          />
        </label>
        <label className="field" htmlFor={`${idPrefix}-to`}>
          <span className="field-label">{t('To ayah')}</span>
          <input
            id={`${idPrefix}-to`}
            className="input tnum"
            type="number"
            inputMode="numeric"
            min={1}
            max={max}
            value={value.to}
            onChange={(event) => {
              const to = clamp(Number(event.target.value));
              onChange({ ...value, to, from: Math.min(value.from, to) });
            }}
          />
        </label>
        <span className="verse-of muted">{t('of {n}', { n: max })}</span>
      </div>
    </div>
  );
}

export function rangeLabel(meta: QuranMeta, range: VerseRange): string {
  const surah = meta.surahs[range.s - 1];
  if (!surah) return '';
  const whole = range.from === 1 && range.to === surah.l.length;
  const name = surahName(surah);
  return whole ? name : `${name} ${range.from}–${range.to}`;
}
