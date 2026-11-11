import { useEffect, useState } from 'react';
import { deleteSurah, listDownloads, onDownloadsChanged, storageEstimate, type SurahRecord } from '../../domain/audio-store';
import { surahName, useQuran } from '../../domain/quran';
import { fmtBytes, reciterById, RECITERS, type ReciterId } from '../../domain/reciters';
import { actions, useStore } from '../../domain/store';
import { isArabic, t } from '../../i18n';
import { isAppleMobile } from './AudioDownloadSheet';
import { SettingRow, SettingStack } from './Controls';
import { Icon } from './Icons';
import { gapLabel } from './PlayerBar';

/** Settings → Recitation: reciter and playback defaults, and every download with its size. */
export function RecitationSettings() {
  const { settings } = useStore();
  const meta = useQuran();
  const [downloads, setDownloads] = useState<SurahRecord[]>([]);
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null);

  useEffect(() => {
    const refresh = () => {
      void listDownloads().then(setDownloads);
      void storageEstimate().then(setUsage);
    };
    refresh();
    return onDownloadsChanged(refresh);
  }, []);

  const total = downloads.reduce((sum, item) => sum + item.bytes, 0);

  return (
    <section className="group">
      <h2>{t('Recitation')}</h2>
      <div className="group-body">
        <SettingStack label={t('Reciter')} hint={t('Teaching recitations are slower, made for memorising.')}>
          <select
            className="select"
            value={settings.reciter}
            onChange={(event) => actions.updateSettings({ reciter: event.target.value as ReciterId })}
            aria-label={t('Reciter')}
          >
            {RECITERS.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {isArabic() ? entry.arabic : entry.name} · {t(entry.style)}
              </option>
            ))}
          </select>
        </SettingStack>
        <SettingRow label={t('Playback')} hint={t('Change these from the player too.')}>
          <span className="muted tnum">
            ×{settings.audioRepeat} · {gapLabel(settings.audioGap)} · {settings.audioRate}×
          </span>
        </SettingRow>
        <SettingStack
          label={t('Downloaded recitation')}
          hint={t('Downloads come from EveryAyah.com once, then play with no connection.')}
        >
          {downloads.length === 0 ? (
            <p className="muted">{t('Nothing downloaded yet. Al-Fatihah, Ayat al-Kursi and Juz 30 (Husary) are built in.')}</p>
          ) : (
            <ul className="dl-list">
              {downloads.map((item) => (
                <li key={item.key}>
                  <span>
                    <b>{meta ? surahName(meta.surahs[item.s - 1]) : item.s}</b>
                    <span className="muted">
                      {(() => {
                        const reciter = reciterById(item.reciter);
                        return isArabic() ? reciter.arabic : reciter.name;
                      })()}{' '}
                      · {fmtBytes(item.bytes)}
                      {item.have < item.total ? ` · ${t('{n} of {total} ayahs', { n: item.have, total: item.total })}` : ''}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="rec-remove"
                    onClick={() => void deleteSurah(item.reciter as ReciterId, item.s, item.total)}
                    aria-label={t('Delete')}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="setting-hint">
            {t('Recitation on this device: {size}', { size: fmtBytes(total) })}
            {usage && usage.quota ? ` · ${t('{free} free for Niyyah', { free: fmtBytes(Math.max(0, usage.quota - usage.usage)) })}` : ''}
          </p>
          {isAppleMobile() ? (
            <p className="setting-hint">{t('On iPhone, audio pauses when the screen locks or you switch apps.')}</p>
          ) : null}
        </SettingStack>
      </div>
    </section>
  );
}
