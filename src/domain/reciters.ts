/**
 * Reciters whose per-ayah recordings Niyyah can play. The files come from
 * EveryAyah.com (https://everyayah.com/data/<folder>/SSSAAA.mp3), downloaded
 * only when the user asks, then kept on the device.
 */

export type ReciterId = 'husary' | 'husary-muallim' | 'alafasy' | 'minshawi';

export interface Reciter {
  id: ReciterId;
  name: string;
  arabic: string;
  /** "Teaching" recordings are slow, with room to repeat — made for memorising. */
  style: 'Murattal' | 'Teaching';
  folder: string;
  /** Average MP3 bytes per Qur'an letter, measured on al-Fatihah, al-Mulk, Ya-Sin and al-Ikhlas. */
  bytesPerLetter: number;
  /** Folder under public/audio/ holding the built-in ayahs, if this reciter has them. */
  builtIn?: string;
}

export const RECITERS: Reciter[] = [
  {
    id: 'husary',
    name: 'Mahmoud Khalil al-Husary',
    arabic: 'محمود خليل الحصري',
    style: 'Murattal',
    folder: 'Husary_64kbps',
    bytesPerLetter: 3783,
    builtIn: 'husary-64',
  },
  {
    id: 'husary-muallim',
    name: 'al-Husary (teaching)',
    arabic: 'الحصري (المصحف المعلّم)',
    style: 'Teaching',
    folder: 'Husary_Muallim_128kbps',
    bytesPerLetter: 7514,
  },
  {
    id: 'alafasy',
    name: 'Mishary Rashid Alafasy',
    arabic: 'مشاري راشد العفاسي',
    style: 'Murattal',
    folder: 'Alafasy_64kbps',
    bytesPerLetter: 2706,
  },
  {
    id: 'minshawi',
    name: 'Muhammad Siddiq al-Minshawi',
    arabic: 'محمد صديق المنشاوي',
    style: 'Murattal',
    folder: 'Minshawy_Murattal_128kbps',
    bytesPerLetter: 4897,
  },
];

export const DEFAULT_RECITER: ReciterId = 'husary';

export function reciterById(id: string | undefined): Reciter {
  return RECITERS.find((reciter) => reciter.id === id) ?? RECITERS[0];
}

/** "067012" — the file name for surah 67, ayah 12. */
export function ayahCode(s: number, a: number): string {
  return `${String(s).padStart(3, '0')}${String(a).padStart(3, '0')}`;
}

export function remoteUrl(reciter: Reciter, s: number, a: number): string {
  return `https://everyayah.com/data/${reciter.folder}/${ayahCode(s, a)}.mp3`;
}

/** The ayahs that ship inside the app: al-Fatihah, Ayat al-Kursi and Juz 30 (an-Naba' to an-Nas). */
export function isBuiltInAyah(s: number, a: number): boolean {
  return s === 1 || (s === 2 && a === 255) || s >= 78;
}

export function fmtBytes(bytes: number): string {
  if (bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(bytes < 10 * 1024 ** 2 ? 1 : 0)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}
