import { configure, isActive, play, skip, toggle, usePlayer, type GapMode } from '../../domain/player';
import { actions, useStore } from '../../domain/store';
import { t } from '../../i18n';
import { Icon } from './Icons';

const REPEATS = [1, 3, 5, 7, 10];
const GAPS: GapMode[] = ['none', 'match', 3, 5, 10];
const RATES = [0.75, 1, 1.25];

function next<T>(list: T[], value: T): T {
  const index = list.indexOf(value);
  return list[(index + 1) % list.length];
}

export function gapLabel(gap: GapMode): string {
  if (gap === 'none') return t('No pause');
  if (gap === 'match') return t('Pause to repeat');
  return t('Pause {n}s', { n: gap });
}

/**
 * Listening controls in the reader: play from where you are, step between
 * ayahs, and three chips that cycle — repeat each ayah, pause after it, speed.
 */
export function PlayerBar({
  s,
  count,
  title,
  from,
}: {
  s: number;
  count: number;
  title: string;
  /** The ayah playback starts from when nothing is playing yet. */
  from: number;
}) {
  const { settings } = useStore();
  const player = usePlayer();
  const here = player.queue[0]?.s === s && player.status !== 'idle';
  const playing = here && isActive(player);
  const ayah = here ? player.queue[player.index]?.a : null;

  function start() {
    if (here) {
      toggle();
      return;
    }
    const queue = Array.from({ length: count - from + 1 }, (_, i) => ({ s, a: from + i }));
    void play(queue, {
      reciter: settings.reciter,
      repeat: settings.audioRepeat,
      gap: settings.audioGap,
      rate: settings.audioRate,
      title,
    });
  }

  return (
    <div className={here ? 'player-bar is-on' : 'player-bar'} role="group" aria-label={t('Recitation')}>
      <button
        type="button"
        className="player-main"
        onClick={start}
        aria-label={playing ? t('Pause') : t('Listen')}
      >
        <Icon name={playing ? 'pause' : 'play'} size={18} />
      </button>
      <div className="player-mid">
        <span className="player-now tnum">
          {ayah
            ? player.status === 'gap'
              ? t('Your turn · ayah {n}', { n: ayah })
              : player.repeat > 1
                ? t('Ayah {n} · {rep} of {total}', { n: ayah, rep: player.rep, total: player.repeat })
                : t('Ayah {n}', { n: ayah })
            : t('Listen from ayah {n}', { n: from })}
        </span>
        <span className="player-chips">
          <button
            type="button"
            className="player-chip"
            onClick={() => {
              const repeat = next(REPEATS, settings.audioRepeat);
              actions.updateSettings({ audioRepeat: repeat });
              configure({ repeat });
            }}
            aria-label={t('Repeat each ayah: {n} times. Tap to change.', { n: settings.audioRepeat })}
          >
            ×{settings.audioRepeat}
          </button>
          <button
            type="button"
            className="player-chip"
            onClick={() => {
              const gap = next(GAPS, settings.audioGap);
              actions.updateSettings({ audioGap: gap });
              configure({ gap });
            }}
          >
            {gapLabel(settings.audioGap)}
          </button>
          <button
            type="button"
            className="player-chip tnum"
            onClick={() => {
              const rate = next(RATES, settings.audioRate);
              actions.updateSettings({ audioRate: rate });
              configure({ rate });
            }}
            aria-label={t('Speed {n}×. Tap to change.', { n: settings.audioRate })}
          >
            {settings.audioRate}×
          </button>
        </span>
      </div>
      {here ? (
        <span className="player-steps">
          <button type="button" className="reader-icon-btn" onClick={() => skip(-1)} aria-label={t('Previous ayah')}>
            <Icon name="chevron" size={18} className="flip" />
          </button>
          <button type="button" className="reader-icon-btn" onClick={() => skip(1)} aria-label={t('Next ayah')}>
            <Icon name="chevron" size={18} className="flip-rtl" />
          </button>
        </span>
      ) : null}
    </div>
  );
}
