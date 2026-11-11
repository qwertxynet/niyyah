import fs from 'node:fs';
import path from 'node:path';

// Builds public/audio/husary-64/: the recitation that ships inside Niyyah —
// al-Fatihah, Ayat al-Kursi (2:255) and Juz 30 (78:1 to the end), one MP3 per
// ayah from EveryAyah.com (Husary, 64 kbps), plus index.json listing them.
//
// Only run this once you have permission to redistribute these recordings.
// It refuses to run without --permission-confirmed so nothing ships by accident.
//
//   npm run quran:audio -- --permission-confirmed

if (!process.argv.includes('--permission-confirmed')) {
  console.error('Refusing to build: confirm redistribution permission first, then pass --permission-confirmed.');
  process.exit(1);
}

const FOLDER = 'Husary_64kbps';
const OUT = 'public/audio/husary-64';
const CACHE = '.cache/audio/husary-64';
const meta = JSON.parse(fs.readFileSync('public/quran-meta.json', 'utf8'));

const code = (s, a) => `${String(s).padStart(3, '0')}${String(a).padStart(3, '0')}`;
const wanted = [];
for (let a = 1; a <= 7; a += 1) wanted.push([1, a]);
wanted.push([2, 255]);
for (let s = 78; s <= 114; s += 1) for (let a = 1; a <= meta.surahs[s - 1].l.length; a += 1) wanted.push([s, a]);

fs.mkdirSync(CACHE, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

let bytes = 0;
let next = 0;
async function worker() {
  while (next < wanted.length) {
    const [s, a] = wanted[next];
    next += 1;
    const file = `${code(s, a)}.mp3`;
    const cached = path.join(CACHE, file);
    if (!fs.existsSync(cached) || fs.statSync(cached).size === 0) {
      const response = await fetch(`https://everyayah.com/data/${FOLDER}/${file}`);
      const type = response.headers.get('content-type') ?? '';
      if (!response.ok || !type.includes('audio')) throw new Error(`${file}: ${response.status} ${type}`);
      const data = Buffer.from(await response.arrayBuffer());
      if (data.length === 0) throw new Error(`${file}: empty`);
      fs.writeFileSync(cached, data);
    }
    fs.copyFileSync(cached, path.join(OUT, file));
    bytes += fs.statSync(cached).size;
    if (next % 50 === 0) console.log(`${next}/${wanted.length}`);
  }
}
await Promise.all([worker(), worker(), worker(), worker()]);

fs.writeFileSync(
  path.join(OUT, 'index.json'),
  JSON.stringify({ source: `EveryAyah.com, ${FOLDER}`, files: wanted.map(([s, a]) => code(s, a)) }),
);
fs.writeFileSync(
  path.join(OUT, 'CREDITS.txt'),
  `Recitation by Sheikh Mahmoud Khalil al-Husary (murattal, 64 kbps), from EveryAyah.com.\nIncluded with permission. Files are unchanged.\n`,
);
console.log(`Wrote ${wanted.length} ayahs to ${OUT}/ (${(bytes / 1024 / 1024).toFixed(1)} MB)`);
