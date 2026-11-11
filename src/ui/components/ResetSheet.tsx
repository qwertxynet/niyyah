import { useState } from 'react';
import { resetAllData, resetSummary } from '../../domain/reset';
import { Icon } from './Icons';
import { Sheet } from './Sheet';
import { plural, t } from '../../i18n';


/**
 * Full reset, spelled out: exactly what goes, a backup offered first, and one
 * clearly labelled button. Nothing is deleted until that button is pressed.
 */
export function ResetSheet({ open, onClose, onBackup }: { open: boolean; onClose: () => void; onBackup: () => void }) {
  const [busy, setBusy] = useState(false);
  const summary = open ? resetSummary() : null;

  async function confirm() {
    setBusy(true);
    try {
      await resetAllData();
    } finally {
      setBusy(false);
      onClose();
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={t('Reset all app data')}>
      <div className="sheet-head">
        <h2 className="sheet-title">{t('Reset all app data?')}</h2>
      </div>
      <p className="sheet-sub">
        {t(
          'This deletes everything Niyyah keeps on this device and starts again from the first screen. It can’t be undone unless you have a backup.',
        )}
      </p>

      {summary ? (
        <ul className="reset-list">
          <li>
            <Icon name="calendar" size={16} /> {t('Prayer history')} ·{' '}
            {plural(summary.prayers, { one: '{n} logged prayer', other: '{n} logged prayers' })}
          </li>
          <li>
            <Icon name="book" size={16} /> {t('Journal')} · {plural(summary.journal, { one: '{n} entry', other: '{n} entries' })}
          </li>
          <li>
            <Icon name="star" size={16} /> {t('Hasanat good deeds')} · {plural(summary.deeds, { one: '{n} deed', other: '{n} deeds' })}
          </li>
          <li>
            <Icon name="clock" size={16} /> {t('Make-up count')} · {summary.qada}
          </li>
          <li>
            <Icon name="sliders" size={16} /> {t('Your name, answers, location and every setting')}
          </li>
          <li>
            <Icon name="bell" size={16} /> {t('All scheduled reminders, and the home-screen widget’s times')}
          </li>
        </ul>
      ) : null}

      <button type="button" className="btn btn-quiet btn-block" onClick={onBackup} disabled={busy}>
        <Icon name="download" size={15} /> {t('Back up first')}
      </button>

      <div className="reset-actions">
        <button type="button" className="btn btn-quiet" onClick={onClose} disabled={busy}>
          {t('Keep my data')}
        </button>
        <button type="button" className="btn btn-danger-solid" style={{ flex: 1 }} onClick={confirm} disabled={busy}>
          {busy ? t('Deleting…') : t('Delete everything')}
        </button>
      </div>
    </Sheet>
  );
}
