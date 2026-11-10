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

// iPhone home-screen icon: 180 px and fully opaque — iOS fills transparent
// corners with black and applies its own rounded mask.
// Square the background off first so iOS's mask is the only rounding.
const fullBleed = Buffer.from(icon.toString('utf8').replace(/(<rect width="512" height="512") rx="\d+"/, '$1'));
await sharp(fullBleed, { density: 384 })
  .resize(180, 180)
  .flatten({ background: '#0B2B22' })
  .png()
  .toFile('public/icons/apple-touch-icon.png');
console.log('wrote public/icons/apple-touch-icon.png 180');

// Transparent mark for Android adaptive icons + the tray.
await sharp(mark, { density: 512 }).resize(1024, 1024).png().toFile('assets/icon-only.png');
await sharp(mark, { density: 128 }).resize(32, 32).png().toFile('electron/tray.png');
console.log('wrote assets/icon-only.png and electron/tray.png');
