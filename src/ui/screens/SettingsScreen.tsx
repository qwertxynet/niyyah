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
import { Sheet } from '../components/Sheet';
import { useUi } from '../ui-context';

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
        ui.toast('Backup copied to the clipboard');
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
    ui.toast('Backup downloaded');
  }

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const text = await file.text();
    const result = importSnapshot(text);
    ui.toast(result.ok ? 'Backup restored' : (result.error ?? 'Import failed'));
  }

  const permissionPill =
    health?.permission === 'granted' ? 'is-good' : health?.permission === 'denied' ? 'is-bad' : 'is-warn';

  return (
    <div className="fade-in">
      <header className="screen-head">
        <h1>Settings</h1>
        <p>Everything here works offline and stays on this device.</p>
      </header>

      <ComfortSection />

      <section className="group">
        <h2>Location</h2>
        <div className="group-body">
          <SettingRow
            label={settings.place?.label ?? 'Not set'}
            hint={
              settings.place
                ? `${settings.place.lat.toFixed(3)}, ${settings.place.lng.toFixed(3)} · ${
                    settings.place.source === 'gps'
                      ? 'from GPS'
                      : settings.place.source === 'search'
                        ? 'chosen from the bundled list'
                        : 'entered by hand'
                  }`
                : 'Pick a city to calculate prayer times'
            }
          >
            <button type="button" className="btn btn-quiet" onClick={() => setLocationOpen(true)}>
              Change
            </button>
          </SettingRow>
        </div>
      </section>

      <section className="group">
        <h2>Prayer calculation</h2>
        <div className="group-body">
          <SettingStack label="Method" hint="Pick the authority your community follows.">
            <select
              className="select"
              value={settings.method}
              onChange={(event) => actions.updateSettings({ method: event.target.value as MethodKey })}
              aria-label="Calculation method"
            >
              {METHODS.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.label} — {method.hint}
                </option>
              ))}
            </select>
          </SettingStack>

          <SettingRow label="Asr madhab" hint="Hanafi calculates Asr later.">
            <Segmented<MadhabKey>
              value={settings.madhab}
              onChange={(madhab) => actions.updateSettings({ madhab })}
              label="Asr madhab"
              options={[
                { value: 'shafi', label: 'Shafi' },
                { value: 'hanafi', label: 'Hanafi' },
              ]}
            />
          </SettingRow>

          <SettingStack label="High latitude rule" hint="Only matters where the sun barely sets.">
            <select
              className="select"
              value={settings.highLat}
              onChange={(event) => actions.updateSettings({ highLat: event.target.value as HighLatKey })}
              aria-label="High latitude rule"
            >
              {HIGH_LATITUDES.map((rule) => (
                <option key={rule.value} value={rule.value}>
                  {rule.label}
                </option>
              ))}
            </select>
          </SettingStack>
        </div>
      </section>

      <section className="group">
        <h2>Display</h2>
        <div className="group-body">
          <SettingRow label="Theme">
            <Segmented<ThemeMode>
              value={settings.theme}
              onChange={(theme) => actions.updateSettings({ theme })}
              label="Theme"
              options={[
                { value: 'auto', label: 'Auto' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
            />
          </SettingRow>
          <SettingRow label="Clock">
            <Segmented<TimeFormat>
              value={settings.timeFormat}
              onChange={(timeFormat) => actions.updateSettings({ timeFormat })}
              label="Clock format"
              options={[
                { value: '12h', label: '12h' },
                { value: '24h', label: '24h' },
              ]}
            />
          </SettingRow>
        </div>
      </section>

      <section className="group">
        <h2>Reminders</h2>
        <div className="group-body">
          <SettingRow label="Allow reminders" hint="Adhan alerts and a pre-alert before each one.">
            <Toggle
              checked={settings.reminders}
              onChange={(reminders) => actions.updateSettings({ reminders })}
              label="Allow reminders"
            />
          </SettingRow>

          <SettingStack
            label="Pre-alert"
            hint={settings.ladder ? 'Transition warnings are on, so they replace this. See Comfort & support.' : undefined}
          >
            <select
              disabled={settings.ladder}
              className="select"
              value={String(settings.preAlert)}
              onChange={(event) => actions.updateSettings({ preAlert: Number(event.target.value) })}
              aria-label="Pre-alert lead time"
            >
              <option value="0">Off — only at the adhan</option>
              {[5, 10, 15, 20, 30].map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} minutes before
                </option>
              ))}
            </select>
          </SettingStack>

          <SettingRow label="Sound" hint="Off keeps nudges silent.">
            <Toggle
              checked={settings.sound}
              onChange={(sound) => actions.setAdaptation('sound', sound)}
              label="Notification sound"
            />
          </SettingRow>

          {platform === 'windows' ? (
            <SettingRow label="Start with Windows" hint="Keeps reminders working with the window closed.">
              <Toggle
                checked={Boolean(autostart)}
                onChange={async (enabled) => {
                  const next = await window.niyyah?.setAutostart(enabled);
                  setAutostart(Boolean(next));
                }}
                label="Start with Windows"
              />
            </SettingRow>
          ) : null}

          <SettingStack label="Reminder health" hint="A quick check that nudges can actually reach you.">
            <div className="health">
              <div className="health-row">
                <span>Platform</span>
                <span className="pill">{platformLabel}</span>
              </div>
              <div className="health-row">
                <span>Notification permission</span>
                <span className={`pill ${permissionPill}`}>
                  {permissionLabel(health?.permission ?? 'prompt')}
                </span>
              </div>
              {platform === 'android' ? (
                <div className="health-row">
                  <span>Alarms &amp; reminders</span>
                  <span
                    className={`pill ${
                      health?.exact === 'granted' ? 'is-good' : health?.exact === 'denied' ? 'is-bad' : 'is-warn'
                    }`}
                  >
                    {health?.exact === 'granted' ? 'Allowed' : health?.exact === 'denied' ? 'Blocked' : 'Unknown'}
                  </span>
                </div>
              ) : null}
              <div className="health-row">
                <span>Scheduled</span>
                <span className="tnum">
                  {health ? `${health.scheduled} alerts` : settings.reminders ? 'checking…' : 'off'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-quiet" onClick={onResync}>
                <Icon name="refresh" size={15} /> Recheck
              </button>
              <button type="button" className="btn btn-quiet" onClick={runTest}>
                <Icon name="bell" size={15} /> Send test
              </button>
            </div>

            {health?.note ? (
              <div className="note warn" style={{ marginTop: 10 }}>
                {health.note}
              </div>
            ) : null}
            {testMessage ? (
              <div className="note" style={{ marginTop: 10 }} role="status">
                {testMessage}
              </div>
            ) : null}
          </SettingStack>

          {platform === 'android' && settings.reminders ? (
            <SettingStack label="If reminders go missing">
              <div className="note">
                <b>1.</b> Android Settings → Apps → Niyyah → Battery → <b>Unrestricted</b>.
                <br />
                <b>2.</b> On Samsung, Xiaomi, Oppo or Vivo, also allow <b>Auto-start</b> for Niyyah.
                <br />
                <b>3.</b> Settings → Apps → Niyyah → <b>Alarms &amp; reminders</b> → allow.
                <br />
                These three settings are the usual reason a scheduled nudge never arrives.
              </div>
            </SettingStack>
          ) : null}

          {platform === 'web' ? (
            <SettingStack label="Browser limits">
              <div className="note">
                A browser can only alert you while Niyyah is open. For reminders that arrive with the
                app closed, use the Android or Windows build.
              </div>
            </SettingStack>
          ) : null}
        </div>
      </section>

      <section className="group">
        <h2>Making up prayers</h2>
        <div className="group-body">
          <SettingRow label="Track make-up prayers" hint="An optional, quiet counter. Never a debt collector.">
            <Toggle
              checked={settings.qadaEnabled}
              onChange={(qadaEnabled) => actions.updateSettings({ qadaEnabled })}
              label="Track make-up prayers"
            />
          </SettingRow>
          <SettingRow label="Set aside" hint="Adjust the counter by hand at any time.">
            <div className="stepper">
              <button
                type="button"
                onClick={() => actions.setQada(qada - 1)}
                disabled={qada === 0}
                aria-label="One fewer"
              >
                <Icon name="minus" size={15} strokeWidth={2.2} />
              </button>
              <span className="tnum" style={{ minWidth: 34, textAlign: 'center', fontWeight: 600 }}>
                {qada}
              </span>
              <button type="button" onClick={() => actions.setQada(qada + 1)} aria-label="One more">
                <Icon name="plus" size={15} strokeWidth={2.2} />
              </button>
            </div>
          </SettingRow>
        </div>
      </section>

      <section className="group">
        <h2>Your data</h2>
        <div className="group-body">
          <SettingRow label="Backup" hint="A single JSON file you can move to another device.">
            <button type="button" className="btn btn-quiet" onClick={exportData}>
              <Icon name="download" size={15} /> Export
            </button>
          </SettingRow>
          <SettingRow label="Restore" hint="Replaces everything currently stored.">
            <button type="button" className="btn btn-quiet" onClick={() => fileRef.current?.click()}>
              <Icon name="upload" size={15} /> Import
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} />
          </SettingRow>
          <SettingRow label="Reset" hint="Clears settings, history and the make-up count.">
            <button
              type="button"
              className="btn btn-quiet btn-danger"
              onClick={() => {
                if (window.confirm('Clear all Niyyah data on this device? This cannot be undone.')) {
                  actions.resetAll();
                }
              }}
            >
              <Icon name="refresh" size={15} /> Reset
            </button>
          </SettingRow>
        </div>
      </section>

      <section className="group">
        <h2>About</h2>
        <div className="group-body">
          <SettingRow label="Niyyah 1.0" hint="A calm prayer companion built for an ADHD brain." />
          <SettingRow
            label="Offline by design"
            hint="Prayer times are computed on your device. No account, no analytics, no network calls at runtime."
          >
            <span className="pill is-good">No network</span>
          </SettingRow>
          <SettingRow
            label="Times by adhan"
            hint="Open-source prayer time calculations (Batoul Apps). Umm al-Qura calendar for the Hijri date."
          />
        </div>
      </section>

      <p className="footnote">Made to be gentle. Change anything, any time.</p>

      <Sheet open={locationOpen} onClose={() => setLocationOpen(false)} title="Choose a location">
        <h2 className="sheet-title" style={{ marginBottom: 4 }}>
          Where are you?
        </h2>
        <p className="sheet-sub">Used only to calculate times on this device.</p>
        <LocationPicker
          value={settings.place}
          onChange={(place) => {
            actions.updateSettings({ place });
            setLocationOpen(false);
          }}
        />
      </Sheet>
    </div>
  );
}
