import { useState, type ReactNode } from 'react';
import { GLOSSARY, type TermId } from '../../domain/glossary';
import { useStore } from '../../domain/store';
import { isArabic, t } from '../../i18n';
import { Sheet } from './Sheet';

/**
 * A word that explains itself. With Learning support on it gets a dotted
 * underline and opens a short definition; otherwise it is plain text.
 */
export function Term({ id, children }: { id: TermId; children?: ReactNode }) {
  const { settings } = useStore();
  const [open, setOpen] = useState(false);
  const term = GLOSSARY[id];
  const word = isArabic() ? term.arabic : t(term.word);
  const label = children ?? word;

  if (!settings.learn) return <>{label}</>;

  return (
    <>
      <button
        type="button"
        className="term"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        aria-label={t('{word}: what does this mean?', { word })}
      >
        {label}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={word}>
        <div className="sheet-head">
          <h2 className="sheet-title">
            {word}
            {isArabic() ? null : <span className="arabic">{term.arabic}</span>}
          </h2>
        </div>
        <p className="term-meaning">{t(term.meaning)}</p>
      </Sheet>
    </>
  );
}
