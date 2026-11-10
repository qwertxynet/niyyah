import fs from 'node:fs';

// Builds public/quran-meta.json: surah names, ayah counts, juz starts and the
// number of letters in every ayah. Only counts ship — not the text — so the
// file stays small and the app can estimate recitation fully offline.
//
// Sources (Tanzil Project, https://tanzil.net — text used unchanged for counting):
//   .cache/quran/quran-simple-clean.txt
//     https://tanzil.net/pub/download/index.php?quranType=simple-clean&outType=txt-2&agree=true
//   .cache/quran/quran-data.js
//     https://tanzil.net/res/text/metadata/quran-data.js
//
// Counting convention: Arabic letters only (hamza forms and alif maqsura count
// as letters), no spaces or marks. The Basmalah that Tanzil prefixes to ayah 1
// of every surah except al-Fatihah and at-Tawbah is not counted, because it is
// not numbered as an ayah of those surahs.

const TEXT = process.argv[2] ?? '.cache/quran/quran-simple-clean.txt';
const META = process.argv[3] ?? '.cache/quran/quran-data.js';
const OUT = process.argv[4] ?? 'public/quran-meta.json';

for (const file of [TEXT, META]) {
  if (!fs.existsSync(file)) {
    console.error(`Missing ${file}. See the download URLs at the top of this script.`);
    process.exit(1);
  }
}

// quran-data.js is parsed as text, never executed.
const meta = fs.readFileSync(META, 'utf8');
function block(name) {
  const start = meta.indexOf(`QuranData.${name} = [`);
  if (start < 0) throw new Error(`No ${name} block in ${META}`);
  return meta.slice(start, meta.indexOf('];', start));
}
// [start, ayas, order, rukus, 'name', "tname", 'ename', 'type']
const SURA_ROW = /\[\s*(\d+),\s*(\d+),\s*\d+,\s*\d+,\s*'([^']+)',\s*"([^"]+)",\s*'((?:[^'\\]|\\.)*)'/g;
const Sura = [[]];
for (const m of block('Sura').matchAll(SURA_ROW)) {
  Sura.push([Number(m[1]), Number(m[2]), 0, 0, m[3], m[4], m[5].replace(/\\'/g, "'")]);
}
const Juz = [[]];
for (const m of block('Juz').matchAll(/\[\s*(\d+),\s*(\d+)\s*\]/g)) Juz.push([Number(m[1]), Number(m[2])]);
if (Sura.length !== 115) throw new Error(`Parsed ${Sura.length - 1} surahs, expected 114`);

const BASMALAH = 'بسم الله الرحمن الرحيم';
const LETTER = /[ء-غف-يٱ]/gu;

const letters = Array.from({ length: 115 }, () => []);
for (const line of fs.readFileSync(TEXT, 'utf8').split(/\r?\n/)) {
  const match = /^(\d+)\|(\d+)\|(.*)$/.exec(line);
  if (!match) continue;
  const surah = Number(match[1]);
  const ayah = Number(match[2]);
  let text = match[3].trim();
  if (ayah === 1 && surah !== 1 && surah !== 9 && text.startsWith(BASMALAH)) {
    text = text.slice(BASMALAH.length).trim();
  }
  letters[surah][ayah - 1] = (text.match(LETTER) ?? []).length;
}

const surahs = [];
for (let s = 1; s <= 114; s += 1) {
  const [, ayahs, , , arabic, name, english] = Sura[s];
  if (letters[s].length !== ayahs) throw new Error(`Surah ${s}: expected ${ayahs} ayahs, got ${letters[s].length}`);
  surahs.push({ n: s, ar: arabic, name, en: english, l: letters[s] });
}

const juz = Juz.slice(1, 31).map(([surah, ayah]) => [surah, ayah]);

const out = { source: 'Tanzil Project (tanzil.net), quran-simple-clean', surahs, juz };
fs.writeFileSync(OUT, JSON.stringify(out));

const total = surahs.reduce((sum, s) => sum + s.l.reduce((a, b) => a + b, 0), 0);
const sum = (n) => surahs[n - 1].l.reduce((a, b) => a + b, 0);
console.log(`Wrote ${OUT}: ${fs.statSync(OUT).size} bytes, ${total} letters`);
console.log(`al-Fatihah ${sum(1)}, al-Ikhlas ${sum(112)}, al-Mulk ${sum(67)}, al-Kahf ${sum(18)}, Ayat al-Kursi ${surahs[1].l[254]}`);
