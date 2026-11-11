import { useEffect, useRef, useState } from 'react';
import { downloadSurahs, type DownloadProgress } from '../../domain/audio-store';
import { lettersIn, surahName, useQuran } from '../../domain/quran';
import { fmtBytes, reciterById, RECITERS, type ReciterId } from '../../domain/reciters';
import { actions, useStore } from '../../domain/store';
import { isArabic, t } from '../../i18n';
import { celebrate } from '../celebrate';
import { Icon } from './Icons';
import { Sheet } from './Sheet';

/** iPhone and iPad web apps can't download in the background or play with the screen locked. */
export const isAppleMobile = () =>
  typeof navigator !== 'undefined' &&
  (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

/**
 * Asks before any audio is downloaded: which reciter, roughly how big, and that
 * it uses the internet once. Shows progress, can be cancelled, and resumes.
 */
export function AudioDownloadSheet({
  surahs,
  onClose,
  onDone,
}: {
  /** Surah numbers to download; empty closes the sheet. */
  surahs: number[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { settings } = useStore();
  const meta = useQuran();
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const saveRef = useRef<HTMLButtonElement>(null);
  const open = surahs.length > 0;
  const reciter = reciterById(settings.reciter);

  useEffect(() => {
    if (!open) {
      abort.current?.abort();
      setProgress(null);
      setError(null);
    }
  }, [open]);

  if (!meta) return null;
  const list = surahs.map((s) => ({ s, ayahs: meta.surahs[s - 1]?.l.length ?? 0 }));
  const letters = surahs.reduce((sum, s) => sum + lettersIn(meta, s), 0);
  const estimate = letters * reciter.bytesPerLetter;
  const label =
    surahs.length === 1 ? surahName(meta.surahs[surahs[0] - 1]) : t('{n} surahs', { n: surahs.length });

  async function start() {
    setError(null);
    abort.current = new AbortController();
    setProgress({ done: 0, total: list.reduce((sum, item) => sum + item.ayahs, 0), bytes: 0 });
    try {
      await downloadSurahs(reciter.id, list, setProgress, abort.current.signal);
      celebrate(saveRef.current, { count: 12 });
      onDone();
    } catch (cause) {
      if ((cause as Error).name === 'AbortError') {
        setProgress(null);
        return;
      }
      const quota = (cause as Error).name === 'QuotaExceededError';
      setError(
        quota
          ? t('This device has no more room for audio. What finished downloading is kept.')
          : t('The download stopped (no connection?). What finished is kept — try again to continue.'),
      );
      setProgress(null);
    }
  }

  const pct = progress && progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Sheet open={open} onClose={onClose} title={t('Download recitation')}>
      <div className="sheet-head">
        <h2 className="sheet-title">{t('Download {what}', { what: label })}</h2>
      </div>
      <p className="sheet-sub">
        {t('This uses the internet once. After that it plays with no connection.')}
      </p>

      <label className="field">
        <span className="field-label">{t('Reciter')}</span>
        <select
          className="select"
          value={reciter.id}
          disabled={Boolean(progress)}
          onChange={(event) => actions.updateSettings({ reciter: event.target.value as ReciterId })}
        >
          {RECITERS.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {isArabic() ? entry.arabic : entry.name} · {t(entry.style)}
            </option>
          ))}
        </select>
      </label>

      <div className="estimate-line">
        <span>{t('Size')}</span>
        <b className="tnum">{t('about {size}', { size: fmtBytes(estimate) })}</b>
      </div>

      {progress ? (
        <div className="dl-progress" aria-live="polite">
          <div className="guide-progress">
            <i style={{ width: `${pct}%` }} />
          </div>
          <p className="muted tnum">
            {t('{done} of {total} ayahs · {size}', { done: progress.done, total: progress.total, size: fmtBytes(progress.bytes) })}
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="note warn" role="status">
          {error}
        </div>
      ) : null}

      {isAppleMobile() ? (
        <p className="setting-hint dl-ios">
          {t('On iPhone, keep Niyyah open until the download finishes. Audio pauses when the screen locks.')}
        </p>
      ) : null}

      <div className="reset-actions">
        {progress ? (
          <button type="button" className="btn btn-quiet" style={{ flex: 1 }} onClick={() => abort.current?.abort()}>
            {t('Cancel')}
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-quiet" onClick={onClose}>
              {t('Not now')}
            </button>
            <button type="button" className="btn btn-solid" style={{ flex: 1 }} onClick={start} ref={saveRef}>
              <Icon name="download" size={16} /> {error ? t('Try again') : t('Download')}
            </button>
          </>
        )}
      </div>
      <p className="reader-credit">{t('Recordings from EveryAyah.com.')}</p>
    </Sheet>
  );
}
