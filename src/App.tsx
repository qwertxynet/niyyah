import { useCallback, useEffect, useMemo, useState } from 'react';
import { setDisplayTimeZone } from './domain/format';
import { buildReminderEvents } from './domain/reminders';
import { syncSchedule, type Health } from './domain/notify';
import { useStore } from './domain/store';
import type { PrayerKey } from './domain/types';
import { BottomNav, type Tab } from './ui/components/BottomNav';
import { Icon } from './ui/components/Icons';
import { PrayerSheet } from './ui/components/PrayerSheet';
import { SettingsScreen } from './ui/screens/SettingsScreen';
import { Setup } from './ui/screens/Setup';
import { Today } from './ui/screens/Today';
import { Week } from './ui/screens/Week';
import { UiContext, type UiApi } from './ui/ui-context';
import { useTheme } from './ui/useTheme';

interface ToastState {
  id: number;
  message: string;
  undo?: () => void;
}

export function App() {
  const state = useStore();
  const { settings } = state;
  useTheme(settings.theme);

  // Times belong to the chosen place, so every formatter reads that clock.
  setDisplayTimeZone(settings.place?.timezone);

  const [tab, setTab] = useState<Tab>('today');
  const [sheet, setSheet] = useState<{ dayKey: string; prayer: PrayerKey } | null>(null);
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
      toast: (message, undo) => setToast({ id: Date.now(), message, undo }),
    }),
    [],
  );

  if (!settings.setupComplete) return <Setup />;

  return (
    <UiContext.Provider value={ui}>
      <div className="shell">
        <div className="brand">
          <span className="wordmark">
            <Icon name="moon" size={17} /> Niyyah
          </span>
          <button
            type="button"
            className="placechip"
            onClick={() => setTab('settings')}
            aria-label={`Location: ${settings.place?.label ?? 'not set'}. Open settings`}
          >
            <Icon name="pin" size={14} />
            <span>{settings.place?.label ?? 'Set location'}</span>
          </button>
        </div>

        {tab === 'today' ? <Today /> : null}
        {tab === 'week' ? <Week /> : null}
        {tab === 'settings' ? <SettingsScreen health={health} onResync={() => void resync()} /> : null}
      </div>

      <BottomNav tab={tab} onChange={setTab} />

      <PrayerSheet target={sheet} onClose={() => setSheet(null)} />

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
              Undo
            </button>
          ) : (
            <button type="button" onClick={() => setToast(null)} aria-label="Dismiss">
              <Icon name="close" size={15} />
            </button>
          )}
        </div>
      ) : null}
    </UiContext.Provider>
  );
}
