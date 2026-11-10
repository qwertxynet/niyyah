import { useEffect, useState } from 'react';

/**
 * Letter counts for every ayah, from public/quran-meta.json (built by
 * scripts/build-quran.mjs from the Tanzil text). Only counts ship — no text —
 * and the file is loaded on demand, like cities.json.
 */
export interface Surah {
  n: number;
  ar: string;
  name: string;
  en: string;
  /** Letters per ayah; index 0 is ayah 1. */
  l: number[];
}

export interface QuranMeta {
  surahs: Surah[];
  /** [surah, ayah] where each of the 30 juz' begins. */
  juz: [number, number][];
}

/** Used until the data file has loaded, so prayer estimates never show blank. */
export const FATIHA_LETTERS_FALLBACK = 143;

let loading: Promise<QuranMeta> | null = null;
let loaded: QuranMeta | null = null;

export function loadQuran(): Promise<QuranMeta> {
  if (loading) return loading;
  const url = new URL('quran-meta.json', document.baseURI).toString();
  loading = fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`quran-meta.json ${response.status}`);
      return response.json() as Promise<QuranMeta>;
    })
    .then((data) => {
      loaded = data;
      return data;
    })
    .catch((error) => {
      loading = null;
      throw error;
    });
  return loading;
}

export function quranNow(): QuranMeta | null {
  return loaded;
}

export function useQuran(): QuranMeta | null {
  const [data, setData] = useState<QuranMeta | null>(loaded);
  useEffect(() => {
    if (data) return;
    let alive = true;
    loadQuran()
      .then((value) => {
        if (alive) setData(value);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [data]);
  return data;
}

export function surah(meta: QuranMeta, n: number): Surah | undefined {
  return meta.surahs[n - 1];
}

/** Letters in surah `n`, ayahs `from`..`to` inclusive (clamped). */
export function lettersIn(meta: QuranMeta, n: number, from = 1, to = Number.POSITIVE_INFINITY): number {
  const s = surah(meta, n);
  if (!s) return 0;
  const start = Math.max(1, Math.min(from, s.l.length));
  const end = Math.max(start, Math.min(to, s.l.length));
  let total = 0;
  for (let i = start - 1; i < end; i += 1) total += s.l[i];
  return total;
}

export function fatihaLetters(meta: QuranMeta | null): number {
  return meta ? lettersIn(meta, 1) : FATIHA_LETTERS_FALLBACK;
}

/** Letters in juz' `j` (1-30). */
export function lettersInJuz(meta: QuranMeta, j: number): number {
  const start = meta.juz[j - 1];
  const next = meta.juz[j];
  if (!start) return 0;
  let total = 0;
  for (let s = start[0]; s <= (next ? next[0] : 114); s += 1) {
    const from = s === start[0] ? start[1] : 1;
    let to = Number.POSITIVE_INFINITY;
    if (next && s === next[0]) {
      if (next[1] === 1) break;
      to = next[1] - 1;
    }
    total += lettersIn(meta, s, from, to);
  }
  return total;
}
