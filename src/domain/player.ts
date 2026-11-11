import { useSyncExternalStore } from 'react';
import { ayahSource } from './audio-store';
import { reciterById, type ReciterId } from './reciters';

/*
 * One recitation player for the whole app: a queue of ayahs, each repeated a
 * set number of times, with an optional pause after each so the listener can
 * recite it back. It plays only audio already on the device; when an ayah is
 * missing it stops in the "missing" state and the screen offers a download.
 */

export type GapMode = 'none' | 'match' | 3 | 5 | 10;

export interface AyahRef {
  s: number;
  a: number;
}

export interface PlayerState {
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'gap' | 'missing';
  reciter: ReciterId;
  queue: AyahRef[];
  index: number;
  /** Which repetition of the current ayah is playing (1-based). */
  rep: number;
  repeat: number;
  gap: GapMode;
  rate: number;
  loop: boolean;
  /** Title for the lock screen, e.g. "Al-Mulk". */
  title: string;
  missing: AyahRef | null;
}

const initial: PlayerState = {
  status: 'idle',
  reciter: 'husary',
  queue: [],
  index: 0,
  rep: 1,
  repeat: 1,
  gap: 'none',
  rate: 1,
  loop: false,
  title: '',
  missing: null,
};

let state: PlayerState = initial;
const listeners = new Set<() => void>();
let audio: HTMLAudioElement | null = null;
let gapTimer = 0;
let token = 0;
type Outcome = 'done' | 'stopped' | 'missing';
let settle: ((outcome: Outcome) => void) | null = null;

/** Ends whoever is waiting on the current play() call. */
function settleWith(outcome: Outcome) {
  const resolve = settle;
  settle = null;
  resolve?.(outcome);
}

function set(patch: Partial<PlayerState>) {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
  updateMediaSession();
}

function element(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.preload = 'auto';
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', () => {
      if (state.status === 'playing' || state.status === 'loading') {
        set({ status: 'missing', missing: state.queue[state.index] ?? null });
        settleWith('missing');
      }
    });
  }
  return audio;
}

async function load(index: number) {
  const mine = ++token;
  window.clearTimeout(gapTimer);
  const ref = state.queue[index];
  if (!ref) return stop(true);
  set({ status: 'loading', index, missing: null });
  const src = await ayahSource(state.reciter, ref.s, ref.a);
  if (mine !== token) return;
  if (!src) {
    set({ status: 'missing', missing: ref });
    settleWith('missing');
    return;
  }
  const player = element();
  player.src = src;
  player.playbackRate = state.rate;
  try {
    // Keep the reciter's natural pitch when slowed or sped up.
    (player as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;
    await player.play();
    if (mine === token) set({ status: 'playing' });
  } catch {
    if (mine === token) set({ status: 'paused' });
  }
}

function onEnded() {
  const player = element();
  const wait =
    state.gap === 'none' ? 0 : state.gap === 'match' ? (player.duration * 1000) / (state.rate || 1) : state.gap * 1000;
  const advance = () => {
    if (state.rep < state.repeat) {
      set({ rep: state.rep + 1 });
      void load(state.index);
    } else if (state.index + 1 < state.queue.length) {
      set({ rep: 1 });
      void load(state.index + 1);
    } else if (state.loop) {
      set({ rep: 1 });
      void load(0);
    } else stop(true);
  };
  if (wait > 0 && Number.isFinite(wait)) {
    set({ status: 'gap' });
    gapTimer = window.setTimeout(advance, Math.min(wait, 30_000));
  } else advance();
}

// ---------- controls ----------

export interface PlayOptions {
  reciter: ReciterId;
  start?: number;
  repeat?: number;
  gap?: GapMode;
  rate?: number;
  loop?: boolean;
  title?: string;
}

/** Plays a queue of ayahs. Resolves when it finishes, is stopped, or reaches an ayah that isn't on the device. */
export function play(queue: AyahRef[], options: PlayOptions): Promise<Outcome> {
  settleWith('stopped');
  set({
    queue,
    reciter: options.reciter,
    repeat: options.repeat ?? state.repeat,
    gap: options.gap ?? state.gap,
    rate: options.rate ?? state.rate,
    loop: options.loop ?? false,
    title: options.title ?? '',
    rep: 1,
  });
  return new Promise((resolve) => {
    settle = resolve;
    void load(options.start ?? 0);
  });
}

export function pause() {
  window.clearTimeout(gapTimer);
  audio?.pause();
  if (state.status === 'playing' || state.status === 'gap' || state.status === 'loading') set({ status: 'paused' });
}

export function resume() {
  if (state.status === 'paused' && audio?.src && !audio.ended) {
    void audio.play().then(() => set({ status: 'playing' }));
  } else if (state.queue.length) void load(state.index);
}

export function toggle() {
  if (state.status === 'playing' || state.status === 'gap' || state.status === 'loading') pause();
  else resume();
}

/** Stops and clears the queue. `natural` is true when the queue simply ran out. */
export function stop(natural = false) {
  token += 1;
  window.clearTimeout(gapTimer);
  audio?.pause();
  set({ status: 'idle', rep: 1 });
  settleWith(natural ? 'done' : 'stopped');
}

export function skip(delta: 1 | -1) {
  const index = Math.max(0, Math.min(state.queue.length - 1, state.index + delta));
  set({ rep: 1 });
  void load(index);
}

export function configure(patch: Partial<Pick<PlayerState, 'repeat' | 'gap' | 'rate' | 'loop'>>) {
  set(patch);
  if (patch.rate && audio) audio.playbackRate = patch.rate;
}

// ---------- subscription ----------

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function playerState(): PlayerState {
  return state;
}

export function usePlayer(): PlayerState {
  return useSyncExternalStore(subscribe, playerState, playerState);
}

export const isActive = (s: PlayerState) => s.status === 'playing' || s.status === 'gap' || s.status === 'loading';

// ---------- lock screen ----------

let mediaWired = false;
function updateMediaSession() {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  const session = navigator.mediaSession;
  if (!mediaWired) {
    mediaWired = true;
    session.setActionHandler('play', () => resume());
    session.setActionHandler('pause', () => pause());
    session.setActionHandler('nexttrack', () => skip(1));
    session.setActionHandler('previoustrack', () => skip(-1));
    session.setActionHandler('stop', () => stop());
  }
  const ref = state.queue[state.index];
  if (!ref || state.status === 'idle') {
    session.playbackState = 'none';
    return;
  }
  session.playbackState = state.status === 'paused' ? 'paused' : 'playing';
  const reciter = reciterById(state.reciter);
  if (typeof MediaMetadata !== 'undefined') {
    session.metadata = new MediaMetadata({
      title: `${state.title || ref.s} · ${ref.a}`,
      artist: reciter.name,
      album: 'Niyyah',
    });
  }
}
