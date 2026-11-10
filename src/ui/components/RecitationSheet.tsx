import { useState } from 'react';
import { fmtHasanat, PER_LETTER, prayerHasanat, RAKAHS } from '../../domain/hasanat';
import { prayerMeta } from '../../domain/prayer-times';
import { fatihaLetters, lettersIn, useQuran, type QuranMeta } from '../../domain/quran';
import { actions, useStore } from '../../domain/store';
import type { PrayerKey, Recitation } from '../../domain/types';
import { Toggle } from './Controls';
import { Icon } from './Icons';
import { Sheet } from './Sheet';
import { rangeLabel, VersePicker, type VerseRange } from './VersePicker';

/**
 * Optional detail for a logged prayer: what was recited in each rak'ah, and
 * whether it was prayed in congregation. Saves as you go.
 */
export function RecitationSheet({
  target,
  onClose,
}: {
  target: { dayKey: string; prayer: PrayerKey } | null;
  onClose: () => void;
}) {
  const { logs } = useStore();
  const meta = useQuran();
  const entry = target ? logs[target.dayKey]?.[target.prayer] : undefined;
  const open = Boolean(target && entry);

  return (
    <Sheet open={open} onClose={onClose} title="Recitation">
      {target && entry ? (
        meta ? (
          <RecitationBody key={`${target.dayKey}:${target.prayer}`} target={target} meta={meta} />
        ) : (
          <p className="muted">Loading the Qur’an index…</p>
        )
      ) : null}
    </Sheet>
  );
}

function RecitationBody({ target, meta }: { target: { dayKey: string; prayer: PrayerKey }; meta: QuranMeta }) {
  const { logs } = useStore();
  const entry = logs[target.dayKey]?.[target.prayer];
  const [adding, setAdding] = useState<number | null>(null);
  const [draft, setDraft] = useState<VerseRange>({ s: 112, from: 1, to: 4 });
  if (!entry) return null;

  const info = prayerMeta(target.prayer);
  const rakahs = RAKAHS[target.prayer];
  const parts = entry.r ?? [];
  const skipped = new Set(entry.nf ?? []);
  const fatiha = fatihaLetters(meta);
  const total = prayerHasanat(entry, target.prayer, meta);

  const save = (patch: { r?: Recitation[]; nf?: number[]; j?: boolean }) =>
    actions.setPrayerDetails(target.dayKey, target.prayer, patch);

  function toggleFatiha(k: number, on: boolean) {
    const next = new Set(skipped);
    if (on) next.delete(k);
    else next.add(k);
    save({ nf: [...next].sort((a, b) => a - b) });
  }

  function addPart(k: number) {
    save({ r: [...parts, { k, s: draft.s, from: draft.from, to: draft.to }] });
    setAdding(null);
  }

  function removePart(index: number) {
    save({ r: parts.filter((_, i) => i !== index) });
  }

  function copyFirst(k: number) {
    const first = parts.filter((part) => part.k === 1).map((part) => ({ ...part, k }));
    save({ r: [...parts.filter((part) => part.k !== k), ...first] });
  }

  return (
    <>
      <div className="sheet-head">
        <h2 className="sheet-title">
          {info.name}
          <span className="arabic">{info.arabic}</span>
        </h2>
      </div>
      <p className="sheet-sub">Optional. Add what you recited for a closer estimate — it saves as you go.</p>

      <div className="rec-row rec-jamaah">
        <span>
          <b>Prayed in congregation</b>
          <span className="muted">Jama‘ah · ×27</span>
        </span>
        <Toggle checked={Boolean(entry.j)} onChange={(next) => save({ j: next })} label="Prayed in congregation" />
      </div>

      {Array.from({ length: rakahs }, (_, index) => index + 1).map((k) => {
        const mine = parts.map((part, index) => ({ part, index })).filter(({ part }) => part.k === k);
        const letters =
          (skipped.has(k) ? 0 : fatiha) + mine.reduce((sum, { part }) => sum + lettersIn(meta, part.s, part.from, part.to), 0);
        return (
          <div key={k} className="rakah">
            <div className="rakah-head">
              <h3>Rak‘ah {k}</h3>
              <span className="muted tnum">≈ {fmtHasanat(letters * PER_LETTER)}</span>
            </div>

            <div className="rec-row">
              <span>Al-Fatihah</span>
              <Toggle checked={!skipped.has(k)} onChange={(on) => toggleFatiha(k, on)} label={`Al-Fatihah in rak'ah ${k}`} />
            </div>

            {mine.map(({ part, index }) => (
              <div key={index} className="rec-row rec-part">
                <span>{rangeLabel(meta, { s: part.s, from: part.from, to: part.to })}</span>
                <span className="muted tnum">≈ {fmtHasanat(lettersIn(meta, part.s, part.from, part.to) * PER_LETTER)}</span>
                <button type="button" className="rec-remove" onClick={() => removePart(index)} aria-label="Remove">
                  <Icon name="close" size={16} />
                </button>
              </div>
            ))}

            {adding === k ? (
              <div className="rec-add">
                <VersePicker meta={meta} value={draft} onChange={setDraft} idPrefix={`rak-${k}`} />
                <div className="rec-add-actions">
                  <button type="button" className="btn btn-quiet" onClick={() => setAdding(null)}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-solid" onClick={() => addPart(k)}>
                    Add · ≈ +{fmtHasanat(lettersIn(meta, draft.s, draft.from, draft.to) * PER_LETTER)}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rec-links">
                <button type="button" className="rec-link" onClick={() => setAdding(k)}>
                  + Add verses
                </button>
                {k > 1 && parts.some((part) => part.k === 1) ? (
                  <button type="button" className="rec-link" onClick={() => copyFirst(k)}>
                    Same as rak‘ah 1
                  </button>
                ) : null}
              </div>
            )}
          </div>
        );
      })}

      <div className="estimate-line">
        <span>This prayer</span>
        <b className="tnum">≈ {fmtHasanat(total)}</b>
      </div>
    </>
  );
}
