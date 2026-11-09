import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const icon = fs.readFileSync('public/icon.svg');
const mark = fs.readFileSync('assets/mark.svg');

fs.mkdirSync('public/icons', { recursive: true });
fs.mkdirSync('assets', { recursive: true });
fs.mkdirSync('build', { recursive: true });

const targets = [
  ['public/icons/icon-192.png', 192],
  ['public/icons/icon-512.png', 512],
  ['build/icon.png', 512],
];

for (const [out, size] of targets) {
  await sharp(icon, { density: 384 }).resize(size, size).png().toFile(out);
  console.log('wrote', out, size);
}

// Transparent mark for Android adaptive icons + the tray.
await sharp(mark, { density: 512 }).resize(1024, 1024).png().toFile('assets/icon-only.png');
await sharp(mark, { density: 128 }).resize(32, 32).png().toFile('electron/tray.png');
console.log('wrote assets/icon-only.png and electron/tray.png');
