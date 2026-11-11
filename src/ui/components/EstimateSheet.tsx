import { DEEDS, JAMAAH_MULTIPLIER, PER_GOOD_DEED, PER_LETTER, RAKAHS } from '../../domain/hasanat';
import { PRAYERS } from '../../domain/prayer-times';
import { fatihaLetters, useQuran } from '../../domain/quran';
import { t } from '../../i18n';
import { Sheet } from './Sheet';

/** The full method, kept one tap away from the Hasanat page. */
export function EstimateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const meta = useQuran();
  const fatiha = fatihaLetters(meta);
  const rakahs = PRAYERS.map((prayer) => `${prayer.name} ${RAKAHS[prayer.key]}`).join(t(', '));

  // Each rule: a bold lead, the rest of the sentence, and its source.
  const rules: { lead: string; rest: string; src?: string }[] = [
    {
      lead: t('A good deed done'),
      rest: t('is written as {n}.', { n: PER_GOOD_DEED }),
      src: 'Bukhari 6491 · Muslim 131',
    },
    {
      lead: t('Each letter of the Qur’an'),
      rest: t('is a good deed, written as {n}.', { n: PER_LETTER }),
      src: 'Tirmidhi 2910',
    },
    {
      lead: t('Each prayer'),
      rest: t(
        'counts as one good deed ({deed}) plus al-Fatihah ({letters} letters × {per}) in every rak‘ah — {rakahs}. Any surah or verses you add per rak‘ah are counted by their letters.',
        { deed: PER_GOOD_DEED, letters: fatiha, per: PER_LETTER, rakahs },
      ),
    },
    {
      lead: t('In congregation'),
      rest: t('the prayer’s estimate is multiplied by {n}.', { n: JAMAAH_MULTIPLIER }),
      src: 'Bukhari 645 · Muslim 650',
    },
    {
      lead: t('Dhikr'),
      rest: t(
        'counts each repetition as a good deed ({n}), except a hundred SubhanAllah, which the hadith names as a thousand.',
        { n: PER_GOOD_DEED },
      ),
      src: 'Muslim 2698',
    },
    {
      lead: t('Qur’an read in the reader'),
      rest: t('counts the letters of exactly the ayahs you mark as read.'),
      src: 'Tirmidhi 2910',
    },
    {
      lead: t('Prayed late, or made up'),
      rest: t('counts the same as on time here. Not today and unlogged prayers count zero and never take anything away.'),
    },
  ];

  return (
    <Sheet open={open} onClose={onClose} title={t('How is this estimated?')}>
      <div className="sheet-head">
        <h2 className="sheet-title">{t('How is this estimated?')}</h2>
      </div>
      <div className="estimate-doc">
        <p className="estimate-warn">
          {t(
            'Only Allah knows the reward of any deed, and He multiplies it for whom He wills. Sincerity, presence and acceptance cannot be counted. These figures take a few well-known narrations at face value to give you a sense of scale — please treat them as encouragement only.',
          )}
        </p>

        <h3>{t('The rules')}</h3>
        <ul className="estimate-rules">
          {rules.map((rule) => (
            <li key={rule.lead}>
              <b>{rule.lead}</b> {rule.rest}
              {rule.src ? <span className="src">{rule.src}</span> : null}
            </li>
          ))}
        </ul>

        <h3>{t('Counting letters')}</h3>
        <p>
          {t(
            'Letters come from the Tanzil Qur’an text (simple, without marks), counted in the app with no network. Only Arabic letters count; spaces and vowel marks do not. The Basmalah is counted as an ayah of al-Fatihah only. Modern spelling writes a few alifs that the Uthmani script leaves out, so totals can differ slightly from counts you may have seen (al-Fatihah is {n} here; 139 is often quoted).',
            { n: fatiha },
          )}
        </p>

        <h3>{t('Deed cards and their sources')}</h3>
        <ul className="estimate-rules">
          {DEEDS.map((deed) => (
            <li key={deed.id}>
              <b>{t(deed.title)}</b> — {t(deed.virtue)}
              <span className="src">{deed.source}</span>
            </li>
          ))}
        </ul>

        <p className="muted estimate-foot">
          {t(
            'References are given for you to check with someone you trust. If a source or number here is wrong, it is a mistake in this app, not in the religion.',
          )}
        </p>
      </div>
    </Sheet>
  );
}
