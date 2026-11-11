import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Builds public/quran/: one file per surah of the Tanzil Uthmani text, for the
// in-app reader. Lines are copied verbatim ("surah|ayah|text") — the text is
// never changed — and every file carries Tanzil's copyright block, as its terms
// of use require. index.json records a SHA-256 of each surah's ayah lines so
// the app can refuse to show a file that has been altered or corrupted.
//
// Source (Tanzil Project, https://tanzil.net):
//   .cache/quran/quran-uthmani.txt
//     https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=txt-2&agree=true&marks=true&sajdah=true&rub=true&alif=true

const SOURCE = process.argv[2] ?? '.cache/quran/quran-uthmani.txt';
const META = 'public/quran-meta.json';
const OUT = 'public/quran';

if (!fs.existsSync(SOURCE)) {
  console.error(`Missing ${SOURCE}. See the download URL at the top of this script.`);
  process.exit(1);
}

const lines = fs.readFileSync(SOURCE, 'utf8').split(/\r?\n/);
const notice = lines.filter((line) => line.startsWith('#'));
if (!notice.some((line) => line.includes('Tanzil Project'))) throw new Error('Copyright block not found');
const version = /Tanzil Quran Text \(([^)]+)\)/.exec(notice.join('\n'))?.[1] ?? 'Uthmani';

const bySurah = Array.from({ length: 115 }, () => []);
for (const line of lines) {
  const match = /^(\d+)\|(\d+)\|/.exec(line);
  if (match) bySurah[Number(match[1])].push(line);
}

const meta = JSON.parse(fs.readFileSync(META, 'utf8'));
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const files = [];
for (let s = 1; s <= 114; s += 1) {
  const ayahs = bySurah[s];
  const expected = meta.surahs[s - 1].l.length;
  if (ayahs.length !== expected) throw new Error(`Surah ${s}: ${ayahs.length} ayahs, expected ${expected}`);
  ayahs.forEach((line, index) => {
    if (!line.startsWith(`${s}|${index + 1}|`)) throw new Error(`Surah ${s}: ayah ${index + 1} out of order`);
  });
  const body = ayahs.join('\n');
  const sha256 = crypto.createHash('sha256').update(body, 'utf8').digest('hex');
  const name = `${String(s).padStart(3, '0')}.txt`;
  fs.writeFileSync(path.join(OUT, name), `${body}\n\n${notice.join('\n')}\n`);
  files.push({ n: s, file: name, sha256 });
}

fs.writeFileSync(
  path.join(OUT, 'index.json'),
  JSON.stringify({ source: `Tanzil Project (tanzil.net), ${version}`, files }),
);
fs.writeFileSync(path.join(OUT, 'TANZIL-NOTICE.txt'), `${notice.join('\n')}\n`);

const size = fs.readdirSync(OUT).reduce((sum, file) => sum + fs.statSync(path.join(OUT, file)).size, 0);
console.log(`Wrote ${files.length} surahs to ${OUT}/ (${Math.round(size / 1024)} KB, ${version})`);
