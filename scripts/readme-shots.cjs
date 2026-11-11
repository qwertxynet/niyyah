/**
 * Captures the README screenshots and banner.
 *
 *   1. npm run dev            (leave it running; note the port)
 *   2. npm run readme:images -- http://localhost:5173
 *
 * Each shot loads the app at phone size with demo data and a fake clock, so the
 * living sky shows the right phase. Then scripts/readme/*.html arranges the
 * shots (kept in .cache/readme/) into the images in docs/readme/.
 * Add --compose-only to re-lay-out existing shots without the dev server.
 */
const { app, BrowserWindow } = require('electron');
const sharp = require('sharp');
const fs = require('node:fs');
const path = require('node:path');

const ORIGIN = process.argv.find((arg) => arg.startsWith('http')) ?? 'http://localhost:5173';
const OUT = path.join(__dirname, '..', 'docs', 'readme');
// Raw phone shots are only ingredients, so they stay out of git.
const SHOTS_DIR = path.join(__dirname, '..', '.cache', 'readme');
const DAY = '2026-11-10';

app.commandLine.appendSwitch('force-device-scale-factor', '2');
app.commandLine.appendSwitch('hide-scrollbars');

const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

function dayKey(offset) {
  const date = new Date(`${DAY}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

/** Demo history: a real-looking week, some prayers late, none scolded. */
function state({ theme, logged }) {
  const logs = {};
  const pattern = ['ontime', 'ontime', 'late', 'ontime', 'ontime'];
  for (let back = 6; back >= 1; back -= 1) {
    const key = dayKey(-back);
    logs[key] = {};
    PRAYERS.forEach((prayer, index) => {
      const s = (back + index) % 7 === 0 ? 'late' : back === 4 && prayer === 'fajr' ? 'missed' : pattern[(index + back) % 5];
      logs[key][prayer] = { s, at: Date.parse(`${key}T12:00:00Z`) };
    });
  }
  logs[DAY] = {};
  for (const prayer of logged) logs[DAY][prayer] = { s: 'ontime', at: Date.parse(`${DAY}T06:30:00Z`) };

  const at = Date.parse(`${DAY}T09:00:00Z`);
  return {
    settings: {
      setupComplete: true,
      place: { lat: 51.5074, lng: -0.1278, label: 'London, United Kingdom', source: 'search', timezone: 'Europe/London' },
      method: 'MWL',
      madhab: 'shafi',
      highLat: 'auto',
      timeFormat: '12h',
      theme,
      reminders: false,
      preAlert: 10,
      sound: true,
      qadaEnabled: true,
      name: 'Maryam',
      profile: null,
      profileAsked: true,
      calm: false,
      coarseTime: false,
      literal: false,
      tone: 'gentle',
      ladder: false,
      ladderSteps: [20, 10],
      catchup: true,
      learn: false,
      hasanatTab: true,
    },
    logs,
    qada: 0,
    dismissed: {},
    deeds: {
      [DAY]: [
        { id: 'd1', rule: 'ayat-al-kursi', label: 'Ayat al-Kursi', h: 4340, at },
        { id: 'd2', rule: 'subhanallah-100', label: 'SubhanAllah ×100', h: 1000, at },
      ],
      [dayKey(-1)]: [{ id: 'd3', rule: 'mulk', label: 'Surah al-Mulk', h: 13130, at: at - 86400000 }],
    },
    journal: {
      [DAY]: [
        {
          id: 'j1',
          at,
          kind: 'checkin',
          prompt: 'How are you arriving today?',
          text: 'Slow start, but I made Fajr.',
          mood: 'okay',
          energy: 'some',
        },
      ],
      [dayKey(-1)]: [
        {
          id: 'j2',
          at: at - 86400000,
          kind: 'gratitude',
          prompt: 'Three things you are grateful for today',
          text: '',
          items: ['A quiet walk after Asr', 'My sister called', 'Warm tea'],
        },
      ],
    },
  };
}

const SHOTS = [
  { name: 'today-fajr', time: '06:12', theme: 'light', logged: [], tab: 'Today' },
  { name: 'today-dhuhr', time: '12:20', theme: 'light', logged: ['fajr'], tab: 'Today' },
  { name: 'today-asr', time: '14:20', theme: 'light', logged: ['fajr', 'dhuhr'], tab: 'Today' },
  { name: 'today-maghrib', time: '16:35', theme: 'light', logged: ['fajr', 'dhuhr', 'asr'], tab: 'Today' },
  { name: 'today-night', time: '21:30', theme: 'dark', logged: ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'], tab: 'Today' },
  { name: 'hasanat', time: '14:20', theme: 'light', logged: ['fajr', 'dhuhr'], tab: 'Hasanat' },
  { name: 'qibla', time: '21:30', theme: 'dark', logged: ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'], tab: 'Qibla' },
  { name: 'journal', time: '16:35', theme: 'light', logged: ['fajr', 'dhuhr', 'asr'], tab: 'Journal' },
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Chromium's network service sometimes restarts between windows; try again. */
async function open(win, target, isFile = false) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await (isFile ? win.loadFile(target) : win.loadURL(target));
    } catch (error) {
      if (attempt >= 5) throw error;
      await wait(700);
    }
  }
}

async function shoot(win, shot) {
  const target = Date.parse(`${DAY}T${shot.time}:00Z`); // London is on GMT in November.
  // The preload shifts the page's clock (see readme-clock.cjs), so the sky shows this phase.
  const url = `${ORIGIN}/?readme-now=${target}`;
  const wc = win.webContents;
  await open(win, url);
  await wc.executeJavaScript(
    `localStorage.clear(); localStorage.setItem('niyyah.state.v1', ${JSON.stringify(JSON.stringify(state(shot)))}); 1`,
  );
  await open(win, url);
  await wait(1200);
  if (shot.tab !== 'Today') {
    const picked = await wc.executeJavaScript(
      `(() => { const b = [...document.querySelectorAll('nav.nav button')].find((el) => el.textContent.trim() === ${JSON.stringify(shot.tab)}); b?.click(); return document.querySelectorAll('nav.nav button').length + ' ' + Boolean(b); })()`,
    );
    console.log('tab', shot.tab, picked);
  }
  await wait(shot.tab === 'Today' ? 1500 : 2500);
  console.log('viewport', await wc.executeJavaScript('innerWidth + "x" + innerHeight'));
  const image = await wc.capturePage();
  fs.writeFileSync(path.join(SHOTS_DIR, `shot-${shot.name}.png`), image.toPNG());
  console.log('shot', shot.name);
}

async function compose(win, name, width, height) {
  win.setContentSize(width, height);
  await open(win, path.join(__dirname, 'readme', `${name}.html`), true);
  await wait(900);
  const image = await win.webContents.capturePage();
  // Palette PNG keeps the transparent corners at a fraction of the size.
  await sharp(image.toPNG()).png({ palette: true, quality: 92, effort: 10 }).toFile(path.join(OUT, `${name}.png`));
  console.log('composed', name);
}

app.whenReady().then(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  // One window for everything: Chromium's network service can drop new windows' first load.
  const win = new BrowserWindow({
    width: 400,
    height: 900,
    show: false,
    enableLargerThanScreen: true,
    useContentSize: true,
    transparent: true,
    frame: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'readme-clock.cjs'),
      contextIsolation: false,
      sandbox: false,
      // Offscreen paints every frame at full size, even taller than this screen.
      offscreen: { deviceScaleFactor: 2 },
      backgroundThrottling: false,
    },
  });
  win.setContentSize(400, 900);
  console.log('window', win.getContentSize().join('x'));
  if (!process.argv.includes('--compose-only')) for (const shot of SHOTS) await shoot(win, shot);
  for (const file of fs.readdirSync(path.join(__dirname, 'readme'))) {
    const match = /^(.+)\.html$/.exec(file);
    if (!match) continue;
    const html = fs.readFileSync(path.join(__dirname, 'readme', file), 'utf8');
    const size = /data-size="(\d+)x(\d+)"/.exec(html);
    await compose(win, match[1], Number(size[1]), Number(size[2]));
  }
  app.quit();
});
