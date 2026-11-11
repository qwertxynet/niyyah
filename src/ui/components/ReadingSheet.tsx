import { useState } from 'react';
import { fmtHasanat, juzHasanat, rangeHasanat, type DeedDef } from '../../domain/hasanat';
import { useQuran } from '../../domain/quran';
import { Sheet } from './Sheet';
import { rangeLabel, VersePicker, type VerseRange } from './VersePicker';

/** "What did you read?" — for the juz' and any-range cards. */
export function ReadingSheet({
  deed,
  onClose,
  onSave,
  onRead,
}: {
  deed: DeedDef | null;
  onClose: () => void;
  /** Open the reader at this surah and ayah instead of logging from memory. */
  onRead: (s: number, from: number) => void;
  onSave: (label: string, hasanat: number) => void;
}) {
  const meta = useQuran();
  const [juz, setJuz] = useState(30);
  const [range, setRange] = useState<VerseRange>({ s: 18, from: 1, to: 110 });

  const open = Boolean(deed);
  const isJuz = deed?.kind === 'juz';
  const estimate = !meta ? null : isJuz ? juzHasanat(meta, juz) : rangeHasanat(meta, range.s, range.from, range.to);
  const label = !meta ? '' : isJuz ? `Juz’ ${juz}` : rangeLabel(meta, range);

  return (
    <Sheet open={open} onClose={onClose} title="What did you read?">
      <div className="sheet-head">
        <h2 className="sheet-title">What did you read?</h2>
      </div>
      <p className="sheet-sub">{isJuz ? 'Pick the juz’ you finished.' : 'Pick a surah and the ayahs you read.'}</p>

      {!meta ? (
        <p className="muted">Loading the Qur’an index…</p>
      ) : isJuz ? (
        <label className="field">
          <span className="field-label">Juz’</span>
          <select className="select" value={juz} onChange={(event) => setJuz(Number(event.target.value))}>
            {meta.juz.map(([s, a], index) => (
              <option key={index} value={index + 1}>
                Juz’ {index + 1} · from {meta.surahs[s - 1].name} {a}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <VersePicker meta={meta} value={range} onChange={setRange} idPrefix="reading" />
      )}

      <div className="estimate-line">
        <span>Estimate</span>
        <b className="tnum">{estimate === null ? '…' : `≈ +${fmtHasanat(estimate)}`}</b>
      </div>

      <button
        type="button"
        className="btn btn-solid btn-block"
        disabled={estimate === null}
        onClick={() => {
          if (estimate !== null) onSave(label, estimate);
        }}
      >
        I read this
      </button>
      {meta ? (
        <button
          type="button"
          className="btn btn-quiet btn-block reading-open"
          onClick={() => (isJuz ? onRead(meta.juz[juz - 1][0], meta.juz[juz - 1][1]) : onRead(range.s, range.from))}
        >
          Read it in the reader instead
        </button>
      ) : null}
    </Sheet>
  );
}
