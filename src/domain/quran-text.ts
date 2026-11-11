/**
 * The Qur'an text for the reader: public/quran/NNN.txt, one file per surah,
 * copied verbatim from the Tanzil Uthmani text by scripts/build-quran-text.mjs.
 *
 * Every file is checked against the SHA-256 recorded in public/quran/index.json
 * before anything is shown. If a file does not match — damaged download, edited
 * copy — the reader says so and shows nothing, rather than a text that might be
 * wrong. The text itself is never changed here; the only presentation step is
 * showing a surah's opening Basmalah as a heading, the way printed mushafs do.
 */

/** Exactly as Tanzil writes al-Fatihah 1:1 (mark order matters: shadda before fatha). */
export const BASMALAH =
  'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

export interface SurahText {
  n: number;
  /** Ayah texts; index 0 is ayah 1 (without the heading Basmalah). */
  ayahs: string[];
  /** True when the Basmalah is shown as a heading above ayah 1. */
  basmalah: boolean;
  /** The heading Basmalah exactly as this surah's file writes it (95 and 97 differ slightly). */
  basmalahText: string;
}

export class QuranIntegrityError extends Error {
  constructor(surah: number) {
    super(`Surah ${surah} failed its integrity check`);
    this.name = 'QuranIntegrityError';
  }
}

interface IndexFile {
  source: string;
  files: { n: number; file: string; sha256: string }[];
}

let index: Promise<IndexFile> | null = null;
const surahs = new Map<number, Promise<SurahText>>();

function url(path: string): string {
  return new URL(path, document.baseURI).toString();
}

function loadIndex(): Promise<IndexFile> {
  if (!index) {
    index = fetch(url('quran/index.json'))
      .then((response) => {
        if (!response.ok) throw new Error(`quran/index.json ${response.status}`);
        return response.json() as Promise<IndexFile>;
      })
      .catch((error) => {
        index = null;
        throw error;
      });
  }
  return index;
}

async function sha256(text: string): Promise<string | null> {
  // crypto.subtle only exists in secure contexts (https, localhost, the apps).
  if (!globalThis.crypto?.subtle) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Arabic letters with every vowel and Qur'anic mark removed, for comparing. */
function lettersOnly(text: string): string {
  return text.replace(/[ً-ٰٟۖ-ۭ]/g, '');
}

async function fetchSurah(n: number): Promise<SurahText> {
  const entry = (await loadIndex()).files.find((file) => file.n === n);
  if (!entry) throw new Error(`No surah ${n}`);
  const response = await fetch(url(`quran/${entry.file}`));
  if (!response.ok) throw new Error(`${entry.file} ${response.status}`);
  const raw = await response.text();

  const lines = raw.split(/\r?\n/).filter((line) => line.startsWith(`${n}|`));
  const digest = await sha256(lines.join('\n'));
  if (digest !== null && digest !== entry.sha256) throw new QuranIntegrityError(n);

  const ayahs = lines.map((line, i) => {
    const prefix = `${n}|${i + 1}|`;
    if (!line.startsWith(prefix)) throw new QuranIntegrityError(n);
    return line.slice(prefix.length);
  });

  // Tanzil starts ayah 1 of most surahs with the Basmalah; show it as a heading.
  // Compare letters only, so a variant mark (e.g. بِّسْمِ in 95 and 97) still
  // matches — and keep the file's own words for the heading, unchanged.
  let basmalah = false;
  let basmalahText = BASMALAH;
  if (n !== 1 && n !== 9) {
    const words = ayahs[0].split(' ');
    const head = words.slice(0, 4).join(' ');
    if (words.length > 4 && lettersOnly(head) === lettersOnly(BASMALAH)) {
      basmalah = true;
      basmalahText = head;
      ayahs[0] = words.slice(4).join(' ');
    }
  }
  return { n, ayahs, basmalah, basmalahText };
}

export function loadSurahText(n: number): Promise<SurahText> {
  let found = surahs.get(n);
  if (!found) {
    found = fetchSurah(n);
    surahs.set(n, found);
    found.catch(() => surahs.delete(n));
  }
  return found;
}

/** Fetches every surah once, so the service worker keeps them for offline reading. */
export async function saveWholeQuran(onProgress: (done: number) => void): Promise<void> {
  let done = 0;
  for (let n = 1; n <= 114; n += 1) {
    await loadSurahText(n);
    done += 1;
    onProgress(done);
  }
}

const DIGITS = '٠١٢٣٤٥٦٧٨٩';
/** Ayah numbers in Arabic-Indic digits, as in the mushaf. */
export function arabicNumber(value: number): string {
  return String(value).replace(/\d/g, (digit) => DIGITS[Number(digit)]);
}
