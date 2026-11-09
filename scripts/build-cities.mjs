import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// Builds public/cities.json from GeoNames' cities15000 dump.
// Shape per row: [name, ascii, country, lat, lng, population, aliases|0, timezone]
// The app must never call a geocoding service, so this file ships in the bundle.

const SRC = process.argv[2] ?? '.cache/geo/cities15000.txt';
const OUT = process.argv[3] ?? 'public/cities.json';
const LIMIT = 3200;

if (!fs.existsSync(SRC)) {
  console.error(`Missing source dump at ${SRC}`);
  console.error('Download https://download.geonames.org/export/dump/cities15000.zip and extract it there.');
  process.exit(1);
}

const rows = fs.readFileSync(SRC, 'utf8').split('\n');
const byKey = new Map();

for (const line of rows) {
  if (!line) continue;
  const f = line.split('\t');
  if (f.length < 15) continue;

  const name = f[1];
  const ascii = f[2];
  const lat = Number(f[4]);
  const lng = Number(f[5]);
  const country = f[8];
  const population = Number(f[14]) || 0;
  const timezone = f[17] || '';

  if (!name || !country || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
  if (population <= 0) continue;

  // A few short ASCII aliases make "Munich" and "Cologne" findable even though
  // GeoNames' primary names are München and Köln.
  const aliases = (f[3] || '')
    .split(',')
    .filter((alias) => alias.length >= 3 && alias.length <= 26 && /^[A-Za-z][A-Za-z .'-]*$/.test(alias))
    .filter((alias) => alias.toLowerCase() !== name.toLowerCase() && alias.toLowerCase() !== ascii.toLowerCase())
    .slice(0, 2);

  const key = `${name.toLowerCase()}|${country}`;
  const existing = byKey.get(key);
  if (existing && existing[5] >= population) continue;

  byKey.set(key, [
    name,
    ascii,
    country,
    Number(lat.toFixed(3)),
    Number(lng.toFixed(3)),
    // Population only needs to rank search results, so 3 significant digits is plenty.
    population >= 1e6 ? Math.round(population / 1e5) * 1e5 : population >= 1e4 ? Math.round(population / 1e3) * 1e3 : population,
    aliases.length ? aliases.join(',') : 0,
    timezone,
  ]);
}

const all = [...byKey.values()].sort((a, b) => b[5] - a[5]);
const picked = all.slice(0, LIMIT);

// Keep every country's three biggest cities even when they are small.
const perCountry = new Map();
for (const city of all) {
  const count = perCountry.get(city[2]) ?? 0;
  if (count >= 3) continue;
  perCountry.set(city[2], count + 1);
  if (!picked.includes(city)) picked.push(city);
}

picked.sort((a, b) => b[5] - a[5]);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const json = JSON.stringify(picked);
fs.writeFileSync(OUT, json);

const gzip = zlib.gzipSync(Buffer.from(json), { level: 9 }).length;
console.log(`cities: ${picked.length} → ${OUT}`);
console.log(`raw ${(json.length / 1024).toFixed(0)} KB · gzip ${(gzip / 1024).toFixed(0)} KB`);
console.log('sample:', JSON.stringify(picked.find((c) => c[0].startsWith('London')) ?? picked[0]));
