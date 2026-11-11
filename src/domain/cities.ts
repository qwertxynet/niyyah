import { language } from '../i18n';

// Search runs entirely against the bundled cities.json — no network, ever.
// Row shape: [name, ascii, country, lat, lng, population, aliases|0, timezone]

export interface City {
  name: string;
  ascii: string;
  country: string;
  lat: number;
  lng: number;
  population: number;
  aliases: string[];
  timezone: string;
  haystack: string;
}

type Row = [string, string, string, number, number, number, string | 0, string];

let loading: Promise<City[]> | null = null;

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const regionNames = new Map<string, Intl.DisplayNames | null>();

/** Country names in the interface language ("United Kingdom" / "المملكة المتحدة"). */
function namesFor(lang: string): Intl.DisplayNames | null {
  if (!regionNames.has(lang)) {
    regionNames.set(
      lang,
      typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames([lang], { type: 'region' }) : null,
    );
  }
  return regionNames.get(lang) ?? null;
}

export function countryName(code: string): string {
  try {
    return namesFor(language())?.of(code) ?? code;
  } catch {
    return code;
  }
}

export function loadCities(): Promise<City[]> {
  if (loading) return loading;
  const url = new URL('cities.json', document.baseURI).toString();
  loading = fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`cities.json ${response.status}`);
      return response.json() as Promise<Row[]>;
    })
    .then((rows) =>
      rows.map((row) => {
        const [name, ascii, country, lat, lng, population, aliases, timezone] = row;
        const aliasList = typeof aliases === 'string' ? aliases.split(',') : [];
        return {
          name,
          ascii,
          country,
          lat,
          lng,
          population,
          aliases: aliasList,
          timezone: timezone || 'UTC',
          haystack: fold([name, ascii, ...aliasList].join(' ')),
        };
      }),
    )
    .catch((error) => {
      loading = null;
      throw error;
    });
  return loading;
}

export function searchCities(cities: City[], query: string, limit = 24): City[] {
  const needle = fold(query.trim());
  if (needle.length < 2) return [];

  const scored: { city: City; score: number }[] = [];

  for (const city of cities) {
    if (!city.haystack.includes(needle)) continue;
    let score = 0;
    if (fold(city.name).startsWith(needle)) score += 3;
    else if (fold(city.ascii).startsWith(needle)) score += 2;
    else score += 1;
    scored.push({ city, score });
  }

  scored.sort((a, b) => b.score - a.score || b.city.population - a.city.population);
  return scored.slice(0, limit).map((entry) => entry.city);
}

export function cityLabel(city: City): string {
  return `${city.name}, ${countryName(city.country)}`;
}

