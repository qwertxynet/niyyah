import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { dateKey } from '../../domain/prayer-times';
import { METHODS } from '../../domain/prayer-times';
import {
  permissionLabel,
  platform,
  platformLabel,
  sendTestNotification,
  type Health,
} from '../../domain/notify';
import { actions, importSnapshot, snapshot, useStore } from '../../domain/store';
import type { HighLatKey, MadhabKey, MethodKey, ThemeMode, TimeFormat } from '../../domain/types';
import { ComfortSection } from '../components/ComfortSection';
import { Segmented, SettingRow, SettingStack, Toggle } from '../components/Controls';
import { Icon } from '../components/Icons';
import { LocationPicker } from '../components/LocationPicker';
import { ResetSheet } from '../components/ResetSheet';
import { Sheet } from '../components/Sheet';
import { useUi } from '../ui-context';
import { t, tc, type Lang } from '../../i18n';

const HIGH_LATITUDES: { value: HighLatKey; label: string }[] = [
  { value: 'auto', label: 'Method default' },
  { value: 'middle', label: 'Middle of the night' },
  { value: 'seventh', label: 'One seventh of the night' },
  { value: 'angle', label: 'Twilight angle' },
];

export function SettingsScreen({ health, onResync }: { health: Health | null; onResync: () => void }) {
  const { settings, qada } = useStore();
  const ui = useUi();
  const [locationOpen, setLocationOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [autostart, setAutostart] = useState<boolean | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (platform !== 'windows') return;
    window.niyyah
      ?.getAutostart()
      .then(setAutostart)
      .catch(() => setAutostart(null));
  }, []);

  async function runTest() {
    const result = await sendTestNotification();
    setTestMessage(result.message);
    onResync();
  }

  async function exportData() {
    const text = snapshot();
    if (platform === 'android') {
      try {
        await navigator.clipboard.writeText(text);
        ui.toast(t('Backup copied to the clipboard'));
        return;
      } catch {
        /* fall through to a download */
      }
    }
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `niyyah-${dateKey(new Date())}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    ui.toast(t('Backup downloaded'));
  }

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const text = await file.text();
    const result = importSnapshot(text);
    ui.toast(result.ok ? t('Backup restored') : t(result.error ?? 'Import failed'));
  }

  const permissionPill =
    health?.permission === 'granted' ? 'is-good' : health?.permission === 'denied' ? 'is-bad' : 'is-warn';

  return (
    <div className="fade-in">
      <header className="screen-head">
        <h1>{t('Settings')}</h1>
        <p>{t('Everything here works offline and stays on this device.')}</p>
      </header>

      <section className="group">
        <h2>{t('Language')}</h2>
        <div className="group-body">
          <SettingRow label={t('App language')} hint={t('Arabic also turns the layout right to left.')}>
            <Segmented<Lang>
              value={settings.language}
              onChange={(language) => actions.updateSettings({ language })}
              label={t('App language')}
              options={[
                { value: 'en', label: 'English' },
                { value: 'ar', label: 'العربية' },
              ]}
            />
          </SettingRow>
        </div>
      </section>

      <ComfortSection />

      <section className="group">
        <h2>{t('Location')}</h2>
        <div className="group-body">
          <SettingRow
            label={settings.place?.label ?? t('Not set')}
            hint={
              settings.place
                ? `${settings.place.lat.toFixed(3)}, ${settings.place.lng.toFixed(3)} · ${
                    settings.place.source === 'gps'
                      ? t('from GPS')
                      : settings.place.source === 'search'
                        ? t('chosen from the bundled list')
                        : t('entered by hand')
                  }`
                : t('Pick a city to calculate prayer times')
            }
          >
            <button type="button" className="btn btn-quiet" onClick={() => setLocationOpen(true)}>
              {t('Change')}
            </button>
          </SettingRow>
        </div>
      </section>

      <section className="group">
        <h2>{t('Prayer calculation')}</h2>
        <div className="group-body">
          <SettingStack label={t('Method')} hint={t('Pick the authority your community follows.')}>
            <select
              className="select"
              value={settings.method}
              onChange={(event) => actions.updateSettings({ method: event.target.value as MethodKey })}
              aria-label={t('Calculation method')}
            >
              {METHODS.map((method) => (
                <option key={method.id} value={method.id}>
                  {t(method.label)} — {t(method.hint)}
                </option>
              ))}
            </select>
          </SettingStack>

          <SettingRow label={t('Asr madhab')} hint={t('Hanafi calculates Asr later.')}>
            <Segmented<MadhabKey>
              value={settings.madhab}
              onChange={(madhab) => actions.updateSettings({ madhab })}
              label={t('Asr madhab')}
              options={[
                { value: 'shafi', label: t('Shafi') },
                { value: 'hanafi', label: t('Hanafi') },
              ]}
            />
          </SettingRow>

          <SettingStack label={t('High latitude rule')} hint={t('Only matters where the sun barely sets.')}>
            <select
              className="select"
              value={settings.highLat}
              onChange={(event) => actions.updateSettings({ highLat: event.target.value as HighLatKey })}
              aria-label={t('High latitude rule')}
            >
              {HIGH_LATITUDES.map((rule) => (
                <option key={rule.value} value={rule.value}>
                  {t(rule.label)}
                </option>
              ))}
            </select>
          </SettingStack>
        </div>
      </section>

      <section className="group">
        <h2>{t('Display')}</h2>
        <div className="group-body">
          <SettingRow label={t('Theme')}>
            <Segmented<ThemeMode>
              value={settings.theme}
              onChange={(theme) => actions.updateSettings({ theme })}
              label={t('Theme')}
              options={[
                { value: 'auto', label: t('Auto') },
                { value: 'light', label: tc('Light', 'theme') },
                { value: 'dark', label: tc('Dark', 'theme') },
              ]}
            />
          </SettingRow>
          <SettingRow label={t('Clock')}>
            <Segmented<TimeFormat>
              value={settings.timeFormat}
              onChange={(timeFormat) => actions.updateSettings({ timeFormat })}
              label={t('Clock format')}
              options={[
                { value: '12h', label: t('12h') },
                { value: '24h', label: t('24h') },
              ]}
            />
          </SettingRow>
        </div>
      </section>

      <section className="group">
        <h2>{t('Reminders')}</h2>
        <div className="group-body">
          <SettingRow label={t('Allow reminders')} hint={t('Adhan alerts and a pre-alert before each one.')}>
            <Toggle
              checked={settings.reminders}
              onChange={(reminders) => actions.updateSettings({ reminders })}
              label={t('Allow reminders')}
            />
          </SettingRow>

          <SettingStack
            label={t('Pre-alert')}
            hint={settings.ladder ? t('Transition warnings are on, so they replace this. See Comfort & support.') : undefined}
          >
            <select
              disabled={settings.ladder}
              className="select"
              value={String(settings.preAlert)}
              onChange={(event) => actions.updateSettings({ preAlert: Number(event.target.value) })}
              aria-label={t('Pre-alert lead time')}
            >
              <option value="0">{t('Off — only at the adhan')}</option>
              {[5, 10, 15, 20, 30].map((minutes) => (
                <option key={minutes} value={minutes}>
                  {t('{n} minutes before', { n: minutes })}
                </option>
              ))}
            </select>
          </SettingStack>

          <SettingRow label={t('Sound')} hint={t('Off keeps nudges silent.')}>
            <Toggle
              checked={settings.sound}
              onChange={(sound) => actions.setAdaptation('sound', sound)}
              label={t('Notification sound')}
            />
          </SettingRow>

          {platform === 'windows' ? (
            <SettingRow label={t('Start with Windows')} hint={t('Keeps reminders working with the window closed.')}>
              <Toggle
                checked={Boolean(autostart)}
                onChange={async (enabled) => {
                  const next = await window.niyyah?.setAutostart(enabled);
                  setAutostart(Boolean(next));
                }}
                label={t('Start with Windows')}
              />
            </SettingRow>
          ) : null}

          <SettingStack label={t('Reminder health')} hint={t('A quick check that nudges can actually reach you.')}>
            <div className="health">
              <div className="health-row">
                <span>{t('Platform')}</span>
                <span className="pill">{t(platformLabel)}</span>
              </div>
              <div className="health-row">
                <span>{t('Notification permission')}</span>
                <span className={`pill ${permissionPill}`}>
                  {permissionLabel(health?.permission ?? 'prompt')}
                </span>
              </div>
              {platform === 'android' ? (
                <div className="health-row">
                  <span>{t('Alarms & reminders')}</span>
                  <span
                    className={`pill ${
                      health?.exact === 'granted' ? 'is-good' : health?.exact === 'denied' ? 'is-bad' : 'is-warn'
                    }`}
                  >
                    {health?.exact === 'granted' ? t('Allowed') : health?.exact === 'denied' ? t('Blocked') : t('Unknown')}
                  </span>
                </div>
              ) : null}
              <div className="health-row">
                <span>{t('Scheduled')}</span>
                <span className="tnum">
                  {health ? t('{n} alerts', { n: health.scheduled }) : settings.reminders ? t('checking…') : t('off')}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-quiet" onClick={onResync}>
                <Icon name="refresh" size={15} /> {t('Recheck')}
              </button>
              <button type="button" className="btn btn-quiet" onClick={runTest}>
                <Icon name="bell" size={15} /> {t('Send test')}
              </button>
            </div>

            {health?.note ? (
              <div className="note warn" style={{ marginTop: 10 }}>
                {t(health.note)}
              </div>
            ) : null}
            {testMessage ? (
              <div className="note" style={{ marginTop: 10 }} role="status">
                {t(testMessage)}
              </div>
            ) : null}
          </SettingStack>

          {platform === 'android' && settings.reminders ? (
            <SettingStack label={t('If reminders go missing')}>
              <div className="note">
                <b>1.</b> {t('Android Settings → Apps → Niyyah → Battery → Unrestricted.')}
                <br />
                <b>2.</b> {t('On Samsung, Xiaomi, Oppo or Vivo, also allow Auto-start for Niyyah.')}
                <br />
                <b>3.</b> {t('Settings → Apps → Niyyah → Alarms & reminders → allow.')}
                <br />
                {t('These three settings are the usual reason a scheduled nudge never arrives.')}
              </div>
            </SettingStack>
          ) : null}

          {platform === 'web' ? (
            <SettingStack label={t('Browser limits')}>
              <div className="note">
                {t('A browser can only alert you while Niyyah is open. For reminders that arrive with the app closed, use the Android or Windows build.')}
              </div>
            </SettingStack>
          ) : null}
        </div>
      </section>

      <section className="group">
        <h2>{t('Making up prayers')}</h2>
        <div className="group-body">
          <SettingRow label={t('Track make-up prayers')} hint={t('An optional, quiet counter. Never a debt collector.')}>
            <Toggle
              checked={settings.qadaEnabled}
              onChange={(qadaEnabled) => actions.updateSettings({ qadaEnabled })}
              label={t('Track make-up prayers')}
            />
          </SettingRow>
          <SettingRow label={t('Set aside')} hint={t('Adjust the counter by hand at any time.')}>
            <div className="stepper">
              <button
                type="button"
                onClick={() => actions.setQada(qada - 1)}
                disabled={qada === 0}
                aria-label={t('One fewer')}
              >
                <Icon name="minus" size={15} strokeWidth={2.2} />
              </button>
              <span className="tnum" style={{ minWidth: 34, textAlign: 'center', fontWeight: 600 }}>
                {qada}
              </span>
              <button type="button" onClick={() => actions.setQada(qada + 1)} aria-label={t('One more')}>
                <Icon name="plus" size={15} strokeWidth={2.2} />
              </button>
            </div>
          </SettingRow>
        </div>
      </section>

      <section className="group">
        <h2>{t('Your data')}</h2>
        <div className="group-body">
          <SettingRow label={t('Backup')} hint={t('A single JSON file you can move to another device.')}>
            <button type="button" className="btn btn-quiet" onClick={exportData}>
              <Icon name="download" size={15} /> {t('Export')}
            </button>
          </SettingRow>
          <SettingRow label={t('Restore')} hint={t('Replaces everything currently stored.')}>
            <button type="button" className="btn btn-quiet" onClick={() => fileRef.current?.click()}>
              <Icon name="upload" size={15} /> {t('Import')}
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} />
          </SettingRow>
          <SettingRow
            label={t('Reset all app data')}
            hint={t('Deletes prayer history, journal, hasanat, answers and settings, and cancels reminders.')}
          >
            <button type="button" className="btn btn-quiet btn-danger" onClick={() => setResetOpen(true)}>
              <Icon name="refresh" size={15} /> {t('Reset')}
            </button>
          </SettingRow>
        </div>
      </section>

      <section className="group">
        <h2>{t('About')}</h2>
        <div className="group-body">
          <SettingRow label={t('Niyyah 1.0')} hint={t('A calm prayer companion built for an ADHD brain.')} />
          <SettingRow
            label={t('Offline by design')}
            hint={t('Prayer times are computed on your device. No account, no analytics, no network calls at runtime.')}
          >
            <span className="pill is-good">{t('No network')}</span>
          </SettingRow>
          <SettingRow
            label={t('Times by adhan')}
            hint={t('Open-source prayer time calculations (Batoul Apps). Umm al-Qura calendar for the Hijri date.')}
          />
          <SettingRow
            label={t('Qur’an text')}
            hint={t('Tanzil Project (tanzil.net), Uthmani text, copied unchanged. Amiri Quran typeface.')}
          />
        </div>
      </section>

      <p className="footnote">{t('Made to be gentle. Change anything, any time.')}</p>

      <Sheet open={locationOpen} onClose={() => setLocationOpen(false)} title={t('Choose a location')}>
        <h2 className="sheet-title" style={{ marginBottom: 4 }}>
          {t('Where are you?')}
        </h2>
        <p className="sheet-sub">{t('Used only to calculate times on this device.')}</p>
        <LocationPicker
          value={settings.place}
          onChange={(place) => {
            actions.updateSettings({ place });
            setLocationOpen(false);
          }}
        />
      </Sheet>
      <ResetSheet open={resetOpen} onClose={() => setResetOpen(false)} onBackup={() => void exportData()} />
    </div>
  );
}
