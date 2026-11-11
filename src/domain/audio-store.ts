import { isBuiltInAyah, reciterById, remoteUrl, ayahCode, type Reciter, type ReciterId } from './reciters';

/*
 * Recitation audio kept on the device. One IndexedDB database works the same
 * in the Android app, the Windows app and the web app (including iPhone home-
 * screen apps): every ayah is a Blob keyed "reciter/SSSAAA", plus a small
 * record per downloaded surah. Nothing here touches the network unless
 * downloadSurahs() is called — and that only happens when the user taps
 * Download.
 */

const DB_NAME = 'niyyah-audio';
const FILES = 'files';
const SURAHS = 'surahs';

export interface SurahRecord {
  key: string;
  reciter: ReciterId;
  s: number;
  /** Ayahs stored so far, and how many the surah has. */
  have: number;
  total: number;
  bytes: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const store = request.result;
        if (!store.objectStoreNames.contains(FILES)) store.createObjectStore(FILES);
        if (!store.objectStoreNames.contains(SURAHS)) store.createObjectStore(SURAHS, { keyPath: 'key' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        dbPromise = null;
        reject(request.error);
      };
    });
  }
  return dbPromise;
}

function run<T>(store: string, mode: IDBTransactionMode, body: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const tx = database.transaction(store, mode);
        const request = body(tx.objectStore(store));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        tx.onabort = () => reject(tx.error ?? new Error('Storage transaction aborted'));
      }),
  );
}

const fileKey = (reciter: ReciterId, s: number, a: number) => `${reciter}/${ayahCode(s, a)}`;
const surahKey = (reciter: ReciterId, s: number) => `${reciter}/${s}`;

// ---------- built-in audio ----------

let builtIn: Promise<Set<string>> | null = null;

/** Which ayah codes ship in public/audio/<folder>/ (empty until the bundle is added). */
function builtInIndex(reciter: Reciter): Promise<Set<string>> {
  if (!reciter.builtIn) return Promise.resolve(new Set());
  if (!builtIn) {
    const url = new URL(`audio/${reciter.builtIn}/index.json`, document.baseURI).toString();
    builtIn = fetch(url)
      .then((response) => (response.ok ? (response.json() as Promise<{ files: string[] }>) : { files: [] }))
      .then((data) => new Set(data.files ?? []))
      .catch(() => new Set<string>());
  }
  return builtIn;
}

/** Fetches every built-in ayah once so the service worker keeps it (web only; the apps bundle them). */
export async function cacheBuiltIn(reciterId: ReciterId, onProgress: (done: number, total: number) => void): Promise<void> {
  const reciter = reciterById(reciterId);
  const files = [...(await builtInIndex(reciter))];
  let done = 0;
  for (const code of files) {
    await fetch(new URL(`audio/${reciter.builtIn}/${code}.mp3`, document.baseURI).toString());
    done += 1;
    onProgress(done, files.length);
  }
}

// ---------- playing ----------

const objectUrls = new Map<string, string>();

/**
 * Where to play an ayah from: the built-in file, a stored download, or null
 * when it has to be downloaded first. Never the network.
 */
export async function ayahSource(reciterId: ReciterId, s: number, a: number): Promise<string | null> {
  const reciter = reciterById(reciterId);
  if (reciter.builtIn && isBuiltInAyah(s, a) && (await builtInIndex(reciter)).has(ayahCode(s, a))) {
    return new URL(`audio/${reciter.builtIn}/${ayahCode(s, a)}.mp3`, document.baseURI).toString();
  }
  const key = fileKey(reciter.id, s, a);
  const cached = objectUrls.get(key);
  if (cached) return cached;
  try {
    const blob = await run<Blob | undefined>(FILES, 'readonly', (store) => store.get(key));
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    objectUrls.set(key, url);
    return url;
  } catch {
    return null;
  }
}

/** True when every ayah in the list can play offline. */
export async function hasAll(reciterId: ReciterId, ayahs: { s: number; a: number }[]): Promise<boolean> {
  for (const { s, a } of ayahs) if (!(await ayahSource(reciterId, s, a))) return false;
  return true;
}

// ---------- downloading ----------

export interface DownloadProgress {
  done: number;
  total: number;
  bytes: number;
}

/**
 * Downloads whole surahs for one reciter, three files at a time. Files already
 * stored are skipped, so a cancelled or interrupted download resumes. Rejects
 * with the first error; whatever was saved stays saved.
 */
export async function downloadSurahs(
  reciterId: ReciterId,
  surahs: { s: number; ayahs: number }[],
  onProgress: (progress: DownloadProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  const reciter = reciterById(reciterId);
  const jobs: { s: number; a: number }[] = [];
  for (const { s, ayahs } of surahs) for (let a = 1; a <= ayahs; a += 1) jobs.push({ s, a });

  void requestPersistence();
  const progress: DownloadProgress = { done: 0, total: jobs.length, bytes: 0 };
  const perSurah = new Map<number, { have: number; bytes: number }>();

  let next = 0;
  async function worker() {
    while (next < jobs.length) {
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      const job = jobs[next];
      next += 1;
      const key = fileKey(reciter.id, job.s, job.a);
      let size = 0;
      const existing = await run<Blob | undefined>(FILES, 'readonly', (store) => store.get(key));
      if (existing) size = existing.size;
      else {
        const response = await fetch(remoteUrl(reciter, job.s, job.a), { signal });
        if (!response.ok) throw new Error(`Ayah ${job.s}:${job.a} — ${response.status}`);
        const blob = await response.blob();
        if (blob.size === 0) throw new Error(`Ayah ${job.s}:${job.a} was empty`);
        await run(FILES, 'readwrite', (store) => store.put(blob, key));
        size = blob.size;
      }
      const tally = perSurah.get(job.s) ?? { have: 0, bytes: 0 };
      tally.have += 1;
      tally.bytes += size;
      perSurah.set(job.s, tally);
      progress.done += 1;
      progress.bytes += size;
      onProgress({ ...progress });
    }
  }

  try {
    await Promise.all([worker(), worker(), worker()]);
  } finally {
    for (const { s, ayahs } of surahs) {
      const tally = perSurah.get(s);
      if (!tally) continue;
      const record: SurahRecord = { key: surahKey(reciter.id, s), reciter: reciter.id, s, have: tally.have, total: ayahs, bytes: tally.bytes };
      await run(SURAHS, 'readwrite', (store) => store.put(record)).catch(() => undefined);
    }
    notify();
  }
}

/** Ask the browser not to clear downloads when space runs low (best effort). */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

// ---------- managing ----------

export async function listDownloads(): Promise<SurahRecord[]> {
  try {
    const all = await run<SurahRecord[]>(SURAHS, 'readonly', (store) => store.getAll());
    return all.sort((x, y) => x.reciter.localeCompare(y.reciter) || x.s - y.s);
  } catch {
    return [];
  }
}

export async function deleteSurah(reciterId: ReciterId, s: number, ayahs: number): Promise<void> {
  for (let a = 1; a <= ayahs; a += 1) {
    const key = fileKey(reciterId, s, a);
    const url = objectUrls.get(key);
    if (url) URL.revokeObjectURL(url);
    objectUrls.delete(key);
    await run(FILES, 'readwrite', (store) => store.delete(key));
  }
  await run(SURAHS, 'readwrite', (store) => store.delete(surahKey(reciterId, s)));
  notify();
}

/** Removes every downloaded file (used by Reset all app data). */
export async function deleteAllAudio(): Promise<void> {
  for (const url of objectUrls.values()) URL.revokeObjectURL(url);
  objectUrls.clear();
  await run(FILES, 'readwrite', (store) => store.clear()).catch(() => undefined);
  await run(SURAHS, 'readwrite', (store) => store.clear()).catch(() => undefined);
  notify();
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    const estimate = await navigator.storage?.estimate?.();
    return estimate ? { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 } : null;
  } catch {
    return null;
  }
}

// Screens showing downloads re-read when they change.
const listeners = new Set<() => void>();
function notify() {
  for (const listener of listeners) listener();
}
export function onDownloadsChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
