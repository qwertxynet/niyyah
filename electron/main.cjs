const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  Notification,
  ipcMain,
  protocol,
  net,
  nativeImage,
  powerMonitor,
} = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const DIST = path.join(__dirname, '..', 'dist');
const DEV_URL = process.env.NIYYAH_DEV_URL;

let win = null;
let tray = null;
let timers = [];
let lastEvents = [];
let planner = null;
let trayMenuLabels = [];
let trayImage = null;

const TOAST_ONLY = process.argv.includes('--toast');
const SELFTEST = process.argv.includes('--self-test');
const SELFTEST_LOG = path.join(os.tmpdir(), 'niyyah-selftest.log');

/** Console plus, under --self-test, a file we can read back from another process. */
function log(line) {
  const text = `${new Date().toISOString()} ${line}`;
  console.log(text);
  if (!SELFTEST && !TOAST_ONLY) return;
  try {
    fs.appendFileSync(SELFTEST_LOG, `${text}\n`);
  } catch {
    /* logging must never take the app down */
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
  },
]);

function resolveFile(pathname) {
  const decoded = decodeURIComponent(pathname);
  const relative = decoded === '/' || decoded === '' ? 'index.html' : decoded.replace(/^\/+/, '');
  const resolved = path.normalize(path.join(DIST, relative));
  if (!resolved.startsWith(DIST)) return path.join(DIST, 'index.html');
  return resolved;
}

function registerProtocol() {
  protocol.handle('app', async (request) => {
    const { pathname } = new URL(request.url);
    const file = resolveFile(pathname);
    try {
      const response = await net.fetch(pathToFileURL(file).toString());
      const headers = new Headers(response.headers);
      headers.set('content-type', MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream');
      return new Response(response.body, { status: response.status, headers });
    } catch {
      return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain' } });
    }
  });
}

function showWindow() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function createWindow() {
  win = new BrowserWindow({
    width: 470,
    height: 920,
    minWidth: 380,
    minHeight: 620,
    backgroundColor: '#FBF7F0',
    show: false,
    autoHideMenuBar: true,
    title: 'Niyyah',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once('ready-to-show', () => win.show());

  win.webContents.on('did-finish-load', () => {
    log(`[niyyah] renderer ready: ${win.webContents.getURL()}`);
    // `electron . --smoke` is used by the build check: load, prove it rendered, exit.
    if (process.argv.includes('--smoke')) setTimeout(() => app.quit(), 800);
    if (TOAST_ONLY) {
      setTimeout(() => {
        log('TOAST_ONLY firing a real adhan-style toast');
        showToast('Fajr in 10 minutes', 'Adhan at 5:26 AM. A little warning, no rush.');
      }, 2500);
      setTimeout(() => {
        app.isQuitting = true;
        app.quit();
      }, 22000);
    }
    if (SELFTEST) {
      runSelfTest().catch((error) => {
        log(`selftest crashed: ${error && error.stack ? error.stack : error}`);
        app.isQuitting = true;
        app.quit();
      });
    }
  });
  win.webContents.on('did-fail-load', (_event, code, description, url) => {
    log(`[niyyah] renderer failed (${code} ${description}) ${url}`);
  });
  win.webContents.on('render-process-gone', (_event, details) => {
    log(`[niyyah] renderer gone ${JSON.stringify(details)}`);
  });

  // Closing the window keeps Niyyah in the tray so reminders keep working.
  win.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      win.hide();
    }
  });

  if (DEV_URL) win.loadURL(DEV_URL);
  else win.loadURL('app://niyyah/index.html');
}

function showToast(title, body, silent) {
  if (!Notification.isSupported()) {
    log(`TOAST_UNSUPPORTED title=${JSON.stringify(title)}`);
    return null;
  }
  log(`TOAST_REQUESTED title=${JSON.stringify(title)} silent=${Boolean(silent)}`);
  const notification = new Notification({ title, body, silent: Boolean(silent) });
  notification.on('click', showWindow);
  notification.on('show', () => log(`TOAST_SHOWN title=${JSON.stringify(title)}`));
  notification.on('failed', (_event, error) => log(`TOAST_FAILED title=${JSON.stringify(title)} error=${error}`));
  notification.on('close', () => log(`TOAST_CLOSED title=${JSON.stringify(title)}`));
  notification.show();
  return notification;
}

function clearTimers() {
  for (const timer of timers) clearTimeout(timer);
  timers = [];
}

function schedule(events) {
  lastEvents = Array.isArray(events) ? events : [];
  clearTimers();

  const now = Date.now();
  // setTimeout caps out around 24 days, so only arm the next week and re-arm later.
  const horizon = now + 7 * 24 * 60 * 60 * 1000;

  for (const event of lastEvents) {
    if (!event || typeof event.at !== 'number') continue;
    const delay = event.at - now;
    if (delay <= 0 || event.at > horizon) continue;
    timers.push(
      setTimeout(() => {
        log(`FIRE kind=${event.kind} at=${new Date(event.at).toISOString()} title=${JSON.stringify(event.title)}`);
        showToast(event.title, event.body, event.silent);
      }, delay),
    );
  }

  if (tray) tray.setToolTip(`Niyyah · ${timers.length} reminders armed`);
  return { scheduled: timers.length };
}

function createTray() {
  trayImage = nativeImage.createFromPath(path.join(__dirname, 'tray.png')).resize({ width: 16, height: 16 });
  tray = new Tray(trayImage);
  tray.setToolTip('Niyyah');
  const template = [
    { label: 'Open Niyyah', click: showWindow },
    {
      label: 'Start with Windows',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ];
  trayMenuLabels = template.map((item) => item.label ?? 'separator');
  tray.setContextMenu(Menu.buildFromTemplate(template));
  tray.on('click', showWindow);
  log(
    `TRAY created emptyIcon=${trayImage.isEmpty()} size=${JSON.stringify(trayImage.getSize())} menu=${trayMenuLabels.join('|')}`,
  );
}

ipcMain.handle('niyyah:schedule', (_event, events) => schedule(events));

ipcMain.handle('niyyah:cancel', () => {
  lastEvents = [];
  clearTimers();
  return { scheduled: 0 };
});

ipcMain.handle('niyyah:test', () => {
  log('[ipc] niyyah:test received from renderer');
  setTimeout(() => showToast('Niyyah test', 'This is what a prayer reminder looks like.'), 1200);
  return true;
});

ipcMain.handle('niyyah:get-autostart', () => app.getLoginItemSettings().openAtLogin);

ipcMain.handle('niyyah:set-autostart', (_event, enabled) => {
  app.setLoginItemSettings({ openAtLogin: Boolean(enabled) });
  return app.getLoginItemSettings().openAtLogin;
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** `2026-11-09 18:42` in a specific IANA zone, so schedule lines match what the UI shows. */
function stamp(ms, timeZone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(ms));
  const get = (type) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
}

/** Used only when the profile has no location yet, so the planner has real inputs. */
const SEED_STATE = {
  settings: {
    setupComplete: true,
    place: {
      lat: 53.481,
      lng: -2.237,
      label: 'Manchester, United Kingdom',
      source: 'search',
      timezone: 'Europe/London',
    },
    method: 'MWL',
    madhab: 'shafi',
    highLat: 'auto',
    timeFormat: '12h',
    theme: 'auto',
    reminders: true,
    preAlert: 10,
    sound: true,
    qadaEnabled: true,
  },
  logs: {},
  qada: 0,
  dismissed: {},
};

/** Clicks the real Settings → "Send test" control and reads today's rows from the DOM. */
const UI_SCRIPT = `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const navTo = (label) => {
    const button = [...document.querySelectorAll('nav button')].find((b) => b.textContent.trim() === label);
    if (button) button.click();
    return Boolean(button);
  };
  navTo('Today');
  await sleep(600);
  const rows = [...document.querySelectorAll('.row')].map((row) => row.innerText.replace(/\\n/g, ' | '));
  navTo('Settings');
  await sleep(700);
  const test = [...document.querySelectorAll('button')].find((b) => b.textContent.trim().includes('Send test'));
  const clicked = Boolean(test);
  if (test) test.click();
  await sleep(3000);
  const notes = [...document.querySelectorAll('.note')].map((n) => n.innerText.trim()).filter(Boolean);
  return { rows, clicked, notes };
})()`;

let selfTestStarted = false;

async function runSelfTest() {
  if (selfTestStarted) return;
  selfTestStarted = true;

  try {
    fs.writeFileSync(SELFTEST_LOG, '');
  } catch {
    /* ignore */
  }

  log('=== selftest ===');
  log(`packaged=${app.isPackaged} appPath=${app.getAppPath()}`);
  log(`version=${app.getVersion()} electron=${process.versions.electron} chrome=${process.versions.chrome}`);
  log(`notificationsSupported=${Notification.isSupported()} aumid=app.niyyah.prayer`);
  log(`userData=${app.getPath('userData')}`);

  const existing = await win.webContents.executeJavaScript(
    `(() => { const raw = localStorage.getItem('niyyah.state.v1'); return raw ? JSON.parse(raw).settings : null; })()`,
    true,
  );

  if (!existing || !existing.place) {
    log('SELFTEST profile has no location — seeding Manchester / MWL / Shafi / pre-alert 10 so the planner has inputs');
    try {
      await win.webContents.executeJavaScript(
        `localStorage.setItem('niyyah.state.v1', ${JSON.stringify(JSON.stringify(SEED_STATE))}); location.reload(); true`,
        true,
      );
    } catch {
      /* the reload destroys this execution context */
    }
  }

  for (let i = 0; i < 80 && lastEvents.length === 0; i += 1) await sleep(250);
  log(`eventsReceived=${lastEvents.length} timersArmed=${timers.length}`);

  const settings = await win.webContents.executeJavaScript(
    `(() => JSON.parse(localStorage.getItem('niyyah.state.v1')).settings)()`,
    true,
  );
  const tz = settings?.place?.timezone ?? 'UTC';
  log(
    `place=${settings?.place?.label} tz=${tz} method=${settings?.method} madhab=${settings?.madhab} preAlert=${settings?.preAlert} sound=${settings?.sound} reminders=${settings?.reminders}`,
  );
  log(`now=${stamp(Date.now(), tz)} (${tz})`);

  const now = Date.now();
  const next24 = lastEvents.filter((event) => event.at > now && event.at <= now + 86400000);
  log(`scheduleNext24h=${next24.length} of ${lastEvents.length}`);
  for (const event of next24) {
    log(`SCHEDULE ${stamp(event.at, tz)} ${String(event.kind).padEnd(8)} ${event.title}`);
  }
  for (const adhan of next24.filter((event) => event.kind === 'adhan')) {
    const pre = next24.find(
      (event) => event.kind === 'prealert' && event.at < adhan.at && adhan.at - event.at <= 3600000,
    );
    log(
      `PAIR ${adhan.title.split('·')[0].trim()} adhan=${stamp(adhan.at, tz)} prealert=${
        pre ? stamp(pre.at, tz) : 'none'
      } lead=${pre ? Math.round((adhan.at - pre.at) / 60000) : 0}min`,
    );
  }

  log(
    `TRAY destroyed=${tray ? tray.isDestroyed() : 'missing'} emptyIcon=${
      trayImage ? trayImage.isEmpty() : 'missing'
    } size=${trayImage ? JSON.stringify(trayImage.getSize()) : '-'} menu=[${trayMenuLabels.join(' | ')}]`,
  );
  try {
    log(`TRAY bounds=${JSON.stringify(tray.getBounds())}`);
  } catch (error) {
    log(`TRAY bounds unavailable: ${error}`);
  }

  const beforeLogin = app.getLoginItemSettings();
  app.setLoginItemSettings({ openAtLogin: true });
  const afterLogin = app.getLoginItemSettings();
  log(
    `AUTOSTART before=${beforeLogin.openAtLogin} after=${afterLogin.openAtLogin} path=${
      afterLogin.path || ''
    } args=${JSON.stringify(afterLogin.args || [])}`,
  );

  const ui = await win.webContents.executeJavaScript(UI_SCRIPT, true);
  log(`UI rows=${JSON.stringify(ui.rows)}`);
  log(`UI sendTestButton=${ui.clicked} notes=${JSON.stringify(ui.notes)}`);

  await sleep(4000);
  log(`=== selftest done, timersArmed=${timers.length} ===`);
  await sleep(14000);
  app.isQuitting = true;
  app.quit();
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', showWindow);

  app.whenReady().then(() => {
    app.setAppUserModelId('app.niyyah.prayer');
    registerProtocol();
    createWindow();
    createTray();

    // Re-arm timers periodically in case the machine slept through one.
    planner = setInterval(() => {
      if (lastEvents.length > 0) schedule(lastEvents);
    }, 6 * 60 * 60 * 1000);

    // Node timers do not advance while Windows is suspended, so a timer armed before
    // sleep fires late (or after the prayer window). Recompute from the wall clock on wake.
    powerMonitor.on('resume', () => {
      log(`POWER resume — re-arming ${lastEvents.length} events from the wall clock`);
      if (lastEvents.length > 0) schedule(lastEvents);
    });
    powerMonitor.on('unlock-screen', () => {
      if (lastEvents.length > 0) schedule(lastEvents);
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
      else showWindow();
    });
  });

  app.on('window-all-closed', () => {
    // Intentionally stay alive in the tray on Windows.
  });

  app.on('before-quit', () => {
    app.isQuitting = true;
    if (planner) clearInterval(planner);
    clearTimers();
  });
}
