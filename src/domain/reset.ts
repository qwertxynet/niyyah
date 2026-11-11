import { syncSchedule } from './notify';
import { actions, currentState } from './store';
import { clearWidget } from './widget';
import { deleteAllAudio } from './audio-store';
import { stop as stopPlayer } from './player';

/** What a full reset will delete, for the confirmation sheet. */
export function resetSummary() {
  const { logs, journal, deeds, qada, settings, hifz } = currentState();
  const count = (record: Record<string, unknown[] | object>) =>
    Object.values(record).reduce<number>(
      (sum, value) => sum + (Array.isArray(value) ? value.length : Object.keys(value).length),
      0,
    );
  return {
    prayers: count(logs),
    journal: count(journal),
    deeds: count(deeds),
    qada,
    memorised: Object.keys(hifz.ayahs).length,
    hasAnswers: Boolean(settings.profile || settings.name),
  };
}

/**
 * Deletes everything Niyyah keeps on this device and returns to first setup:
 * history, journal, hasanat deeds, make-up count, answers, name and settings.
 * Also cancels every scheduled reminder and empties the home-screen widget,
 * so nothing from the old data keeps firing after the reset.
 */
export async function resetAllData(): Promise<void> {
  // Reminders first: on Android and Windows they live outside the app.
  await syncSchedule([]).catch(() => undefined);
  await clearWidget();
  stopPlayer();
  await deleteAllAudio();

  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith('niyyah.')) keys.push(key);
    }
    for (const key of keys) localStorage.removeItem(key);
  } catch {
    // Storage blocked: the in-memory reset below still applies.
  }

  actions.resetAll();
}
