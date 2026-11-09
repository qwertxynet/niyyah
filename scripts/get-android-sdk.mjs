import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

// Installs a user-local Android SDK (no administrator rights, nothing system-wide).
// Usage: node scripts/get-android-sdk.mjs
//
// Windows refuses directory renames across some folders (EPERM), so the tools
// archive is expanded in place and then copied into cmdline-tools/latest.

const localAppData = process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local');
const sdkRoot = path.join(localAppData, 'Android', 'Sdk');
const toolsDir = path.join(sdkRoot, 'cmdline-tools');
const latestDir = path.join(toolsDir, 'latest');
const extractDir = path.join(toolsDir, '_extract');
const cache = path.join('.cache');
const zipPath = path.resolve(cache, 'cmdline-tools.zip');
const sdkmanager = path.join(latestDir, 'bin', 'sdkmanager.bat');

fs.mkdirSync(toolsDir, { recursive: true });
fs.mkdirSync(cache, { recursive: true });

async function latestToolsUrl() {
  const response = await fetch('https://dl.google.com/android/repository/repository2-3.xml');
  const xml = await response.text();
  const ids = [...xml.matchAll(/commandlinetools-win-(\d+)_latest\.zip/g)].map((match) => match[1]);
  if (ids.length === 0) throw new Error('No command-line tools in the Android repository index.');
  const newest = ids.sort((a, b) => Number(b) - Number(a))[0];
  return `https://dl.google.com/android/repository/commandlinetools-win-${newest}_latest.zip`;
}

if (!fs.existsSync(sdkmanager)) {
  const url = await latestToolsUrl();
  console.log(`Downloading ${url}`);

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  fs.writeFileSync(zipPath, Buffer.from(await response.arrayBuffer()));

  fs.rmSync(extractDir, { recursive: true, force: true });
  console.log('Extracting…');
  execSync(
    `powershell.exe -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${extractDir}' -Force"`,
    { stdio: 'inherit' },
  );

  const inner = path.join(extractDir, 'cmdline-tools');
  if (!fs.existsSync(path.join(inner, 'bin', 'sdkmanager.bat'))) {
    throw new Error(`Unexpected archive layout; looked for ${path.join(inner, 'bin', 'sdkmanager.bat')}`);
  }

  fs.rmSync(latestDir, { recursive: true, force: true });
  console.log(`Copying tools into ${latestDir}`);
  fs.cpSync(inner, latestDir, { recursive: true });
  fs.rmSync(extractDir, { recursive: true, force: true });
} else {
  console.log(`Command-line tools already present in ${latestDir}`);
}

const packages = ['platform-tools', 'platforms;android-36', 'build-tools;36.0.0'];

console.log('Accepting licences…');
try {
  execSync(`"${sdkmanager}" --licenses --sdk_root="${sdkRoot}"`, {
    input: 'y\r\n'.repeat(120),
    stdio: ['pipe', 'inherit', 'inherit'],
    shell: 'cmd.exe',
  });
} catch {
  console.log('Licence step returned non-zero — usually means they were already accepted.');
}

console.log(`Installing ${packages.join(', ')}…`);
execSync(`"${sdkmanager}" ${packages.map((pkg) => `"${pkg}"`).join(' ')} --sdk_root="${sdkRoot}"`, {
  stdio: 'inherit',
  shell: 'cmd.exe',
});

const ok =
  fs.existsSync(path.join(sdkRoot, 'platforms', 'android-36')) &&
  fs.existsSync(path.join(sdkRoot, 'build-tools', '36.0.0'));
console.log(ok ? `\nAndroid SDK ready at ${sdkRoot}` : '\nSDK install finished but expected folders are missing.');
process.exit(ok ? 0 : 1);
