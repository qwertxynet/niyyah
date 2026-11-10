import { DEEDS, JAMAAH_MULTIPLIER, PER_GOOD_DEED, PER_LETTER, RAKAHS } from '../../domain/hasanat';
import { fatihaLetters, useQuran } from '../../domain/quran';
import { Sheet } from './Sheet';

/** The full method, kept one tap away from the Hasanat page. */
export function EstimateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const meta = useQuran();
  const fatiha = fatihaLetters(meta);

  return (
    <Sheet open={open} onClose={onClose} title="How is this estimated?">
      <div className="sheet-head">
        <h2 className="sheet-title">How is this estimated?</h2>
      </div>
      <div className="estimate-doc">
        <p className="estimate-warn">
          Only Allah knows the reward of any deed, and He multiplies it for whom He wills. Sincerity, presence and
          acceptance cannot be counted. These figures take a few well-known narrations at face value to give you a sense
          of scale — please treat them as encouragement only.
        </p>

        <h3>The rules</h3>
        <ul className="estimate-rules">
          <li>
            <b>A good deed done</b> is written as {PER_GOOD_DEED}.<span className="src">Bukhari 6491 · Muslim 131</span>
          </li>
          <li>
            <b>Each letter of the Qur’an</b> is a good deed, written as {PER_LETTER}.
            <span className="src">Tirmidhi 2910</span>
          </li>
          <li>
            <b>Each prayer</b> counts as one good deed ({PER_GOOD_DEED}) plus al-Fatihah ({fatiha} letters ×{' '}
            {PER_LETTER}) in every rak‘ah — {Object.entries(RAKAHS)
              .map(([key, count]) => `${key[0].toUpperCase()}${key.slice(1)} ${count}`)
              .join(', ')}
            . Any surah or verses you add per rak‘ah are counted by their letters.
          </li>
          <li>
            <b>In congregation</b> the prayer’s estimate is multiplied by {JAMAAH_MULTIPLIER}.
            <span className="src">Bukhari 645 · Muslim 650</span>
          </li>
          <li>
            <b>Dhikr</b> counts each repetition as a good deed ({PER_GOOD_DEED}), except a hundred SubhanAllah, which the
            hadith names as a thousand.<span className="src">Muslim 2698</span>
          </li>
          <li>
            <b>Prayed late, or made up</b> counts the same as on time here. <b>Not today</b> and unlogged prayers count
            zero and never take anything away.
          </li>
        </ul>

        <h3>Counting letters</h3>
        <p>
          Letters come from the Tanzil Qur’an text (simple, without marks), counted in the app with no network. Only
          Arabic letters count; spaces and vowel marks do not. The Basmalah is counted as an ayah of al-Fatihah only.
          Modern spelling writes a few alifs that the Uthmani script leaves out, so totals can differ slightly from
          counts you may have seen (al-Fatihah is {fatiha} here; 139 is often quoted).
        </p>

        <h3>Deed cards and their sources</h3>
        <ul className="estimate-rules">
          {DEEDS.map((deed) => (
            <li key={deed.id}>
              <b>{deed.title}</b> — {deed.virtue}
              <span className="src">{deed.source}</span>
            </li>
          ))}
        </ul>

        <p className="muted estimate-foot">
          References are given for you to check with someone you trust. If a source or number here is wrong, it is a
          mistake in this app, not in the religion.
        </p>
      </div>
    </Sheet>
  );
}
