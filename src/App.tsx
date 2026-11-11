import { useCallback, useEffect, useMemo, useState } from 'react';
import { setDisplayTimeZone } from './domain/format';
import { setLanguage, t } from './i18n';
import { buildReminderEvents } from './domain/reminders';
import { syncSchedule, type Health } from './domain/notify';
import { actions, useStore } from './domain/store';
import { syncWidget } from './domain/widget';
import type { PrayerKey } from './domain/types';
import { BottomNav, type Tab } from './ui/components/BottomNav';
import { Icon } from './ui/components/Icons';
import { PrayerSheet } from './ui/components/PrayerSheet';
import { RecitationSheet } from './ui/components/RecitationSheet';
import { AboutYouOverlay } from './ui/screens/AboutYou';
import { Guide } from './ui/screens/Guide';
import { Hasanat } from './ui/screens/Hasanat';
import { Journal } from './ui/screens/Journal';
import { Qibla } from './ui/screens/Qibla';
import { Reader, type ReaderTarget } from './ui/screens/Reader';
import { SettingsScreen } from './ui/screens/SettingsScreen';
import { Setup } from './ui/screens/Setup';
import { Today } from './ui/screens/Today';
import { UiContext, type GuideTarget, type JournalIntent, type UiApi } from './ui/ui-context';
import { useSky } from './ui/useSky';
import { useTheme } from './ui/useTheme';

interface ToastState {
  id: number;
  message: string;
  undo?: () => void;
}

export function App() {
  const state = useStore();
  const { settings } = state;
  const resolvedTheme = useTheme(settings.theme, settings.calm);
  useSky(settings, resolvedTheme);

  // Times belong to the chosen place, so every formatter reads that clock.
  setDisplayTimeZone(settings.place?.timezone);
  setLanguage(settings.language);

  const [tab, setTab] = useState<Tab>('today');
  useEffect(() => {
    if (tab === 'hasanat' && !settings.hasanatTab) setTab('today');
  }, [tab, settings.hasanatTab]);
  const [sheet, setSheet] = useState<{ dayKey: string; prayer: PrayerKey } | null>(null);
  const [recitation, setRecitation] = useState<{ dayKey: string; prayer: PrayerKey } | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [guide, setGuide] = useState<GuideTarget | null>(null);
  const [journalIntent, setJournalIntent] = useState<JournalIntent | null>(null);
  const clearJournalIntent = useCallback(() => setJournalIntent(null), []);
  const [reader, setReader] = useState<ReaderTarget | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [health, setHealth] = useState<Health | null>(null);

  const resync = useCallback(async () => {
    if (!settings.setupComplete || !settings.place) return;
    const events = buildReminderEvents(settings);
    const result = await syncSchedule(events);
    setHealth(result);
  }, [settings]);

  useEffect(() => {
    if (!settings.setupComplete) return;
    const timer = window.setTimeout(() => {
      void resync();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [resync, settings.setupComplete]);

  // The home-screen widget mirrors times and logged status, so push on any change
  // (and on resume, which rolls its window forward a day).
  const [visibleTick, setVisibleTick] = useState(0);
  useEffect(() => {
    if (!state.settings.setupComplete) return;
    const timer = window.setTimeout(() => {
      void syncWidget(state);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [state, visibleTick]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setVisibleTick((tick) => tick + 1);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void resync();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [resync]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const ui = useMemo<UiApi>(
    () => ({
      openPrayer: (dayKey, prayer) => setSheet({ dayKey, prayer }),
      openRecitation: (dayKey, prayer) => setRecitation({ dayKey, prayer }),
      openAboutYou: () => setAboutOpen(true),
      openGuide: (target) => setGuide(target),
      openJournal: (intent) => {
        setJournalIntent(intent);
        setTab('week');
      },
      openReader: (target) => setReader(target ?? {}),
      toast: (message, undo) => setToast({ id: Date.now(), message, undo }),
    }),
    [],
  );

  if (!settings.setupComplete) return <Setup />;

  return (
    <UiContext.Provider value={ui}>
      {/* Decoration only: shooting stars at night, drifting light by day. */}
      <div className="sky-fx" aria-hidden="true">
        <i className="shoot" />
        <i className="shoot shoot-2" />
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <b key={index} className={`mote mote-${index}`} />
        ))}
      </div>
      <div className="shell">
        <div className="brand">
          <span className="wordmark">
            <Icon name="moon" size={17} /> {t('Niyyah')}
          </span>
          <button
            type="button"
            className="placechip"
            onClick={() => setTab('settings')}
            aria-label={t('Location: {place}. Open settings', { place: settings.place?.label ?? t('not set') })}
          >
            <Icon name="pin" size={14} />
            <span>{settings.place?.label ?? t('Set location')}</span>
          </button>
        </div>

        {tab === 'today' ? <Today /> : null}
        {tab === 'qibla' ? <Qibla /> : null}
        {tab === 'hasanat' && settings.hasanatTab ? <Hasanat /> : null}
        {tab === 'week' ? <Journal intent={journalIntent} onIntentUsed={clearJournalIntent} /> : null}
        {tab === 'settings' ? <SettingsScreen health={health} onResync={() => void resync()} /> : null}
      </div>

      <BottomNav tab={tab} onChange={setTab} hidden={settings.hasanatTab ? [] : ['hasanat']} />

      <PrayerSheet target={sheet} onClose={() => setSheet(null)} />
      <RecitationSheet target={recitation} onClose={() => setRecitation(null)} />

      {aboutOpen ? (
        <AboutYouOverlay
          settings={settings}
          skipLabel={t('Not now')}
          onSkip={() => {
            if (!settings.profile) actions.updateSettings({ profileAsked: true });
            setAboutOpen(false);
          }}
          onComplete={(profile, patch) => {
            actions.applyProfile(profile, patch);
            setAboutOpen(false);
            setTab('settings');
            setToast({ id: Date.now(), message: t('Saved. Every change is listed under Comfort & support.') });
          }}
        />
      ) : null}

      {guide ? <Guide target={guide} onClose={() => setGuide(null)} /> : null}
      {reader ? <Reader target={reader} onClose={() => setReader(null)} /> : null}

      {toast ? (
        <div className="toast" role="status" key={toast.id}>
          <span>{toast.message}</span>
          {toast.undo ? (
            <button
              type="button"
              onClick={() => {
                toast.undo?.();
                setToast(null);
              }}
            >
              {t('Undo')}
            </button>
          ) : (
            <button type="button" onClick={() => setToast(null)} aria-label={t('Dismiss')}>
              <Icon name="close" size={15} />
            </button>
          )}
        </div>
      ) : null}
    </UiContext.Provider>
  );
}
