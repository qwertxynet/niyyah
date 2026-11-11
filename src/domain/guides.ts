import { RAKAHS } from './hasanat';
import { prayerMeta } from './prayer-times';
import { t } from '../i18n';
import type { PrayerKey } from './types';

/*
 * Step-by-step guides for Learning support: one action per page, with the
 * Arabic, a transliteration and a plain meaning written for this app. These
 * are the widely shared basics; details differ a little between schools, so
 * the guide says to learn alongside someone you trust.
 */

export interface GuideStep {
  /** Where you are, e.g. "Rak‘ah 2 of 4". */
  section: string;
  title: string;
  body: string;
  arabic?: string;
  translit?: string;
  meaning?: string;
  /** How many times, when it is repeated. */
  times?: number;
  /** The Arabic shown is only the opening words of a longer recitation. */
  partial?: boolean;
}

const PHRASE = {
  bismillah: { arabic: 'بِسْمِ ٱللَّٰهِ', translit: 'Bismillah', meaning: 'In the name of Allah.' },
  takbir: { arabic: 'ٱللَّٰهُ أَكْبَرُ', translit: 'Allahu akbar', meaning: 'Allah is the greatest.' },
  ruku: {
    arabic: 'سُبْحَانَ رَبِّيَ ٱلْعَظِيمِ',
    translit: 'Subhana rabbiyal-‘azim',
    meaning: 'Glory be to my Lord, the Most Great.',
  },
  rise: {
    arabic: 'سَمِعَ ٱللَّٰهُ لِمَنْ حَمِدَهُ · رَبَّنَا وَلَكَ ٱلْحَمْدُ',
    translit: 'Sami‘allahu liman hamidah · Rabbana wa lakal-hamd',
    meaning: 'Allah hears whoever praises Him. Our Lord, all praise is Yours.',
  },
  sujud: {
    arabic: 'سُبْحَانَ رَبِّيَ ٱلْأَعْلَىٰ',
    translit: 'Subhana rabbiyal-a‘la',
    meaning: 'Glory be to my Lord, the Most High.',
  },
  between: { arabic: 'رَبِّ ٱغْفِرْ لِي', translit: 'Rabbighfir li', meaning: 'My Lord, forgive me.' },
  fatiha: {
    arabic: 'ٱلْحَمْدُ لِلَّٰهِ رَبِّ ٱلْعَٰلَمِينَ',
    translit:
      'Bismillahir-rahmanir-rahim · Al-hamdu lillahi rabbil-‘alamin · Ar-rahmanir-rahim · Maliki yawmid-din · Iyyaka na‘budu wa iyyaka nasta‘in · Ihdinas-siratal-mustaqim · Siratal-ladhina an‘amta ‘alayhim, ghayril-maghdubi ‘alayhim wa lad-dallin · Amin',
    meaning:
      'Praise belongs to Allah, Lord of everything, the Most Merciful, Master of the Day of Judgement. We worship You alone and ask You alone for help. Guide us on the straight path.',
    partial: true,
  },
  ikhlas: {
    arabic: 'قُلْ هُوَ ٱللَّٰهُ أَحَدٌ',
    translit: 'Qul huwallahu ahad · Allahus-samad · Lam yalid wa lam yulad · Wa lam yakun lahu kufuwan ahad',
    meaning: 'Say: He is Allah, the One. Allah, whom all depend on. He has no child and no parent, and nothing is like Him.',
    partial: true,
  },
  tashahhud: {
    arabic: 'ٱلتَّحِيَّاتُ لِلَّٰهِ',
    translit:
      'At-tahiyyatu lillahi was-salawatu wat-tayyibat · As-salamu ‘alayka ayyuhan-nabiyyu wa rahmatullahi wa barakatuh · As-salamu ‘alayna wa ‘ala ‘ibadillahis-salihin · Ashhadu an la ilaha illallah, wa ashhadu anna Muhammadan ‘abduhu wa rasuluh',
    meaning:
      'All greetings and good things belong to Allah. Peace be on you, O Prophet, and on us and all good servants of Allah. I bear witness there is no god but Allah, and Muhammad is His servant and messenger.',
    partial: true,
  },
  salawat: {
    arabic: 'ٱللَّٰهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ',
    translit:
      'Allahumma salli ‘ala Muhammadin wa ‘ala ali Muhammad, kama sallayta ‘ala Ibrahima wa ‘ala ali Ibrahim, innaka hamidun majid · Allahumma barik ‘ala Muhammadin wa ‘ala ali Muhammad, kama barakta ‘ala Ibrahima wa ‘ala ali Ibrahim, innaka hamidun majid',
    meaning:
      'O Allah, send blessings and grace on Muhammad and his family, as You did on Ibrahim and his family. You are Praiseworthy, Glorious.',
    partial: true,
  },
  salam: {
    arabic: 'ٱلسَّلَامُ عَلَيْكُمْ وَرَحْمَةُ ٱللَّٰهِ',
    translit: 'As-salamu ‘alaykum wa rahmatullah',
    meaning: 'Peace be upon you, and the mercy of Allah.',
  },
  shahada: {
    arabic: 'أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا ٱللَّٰهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ',
    translit: 'Ashhadu an la ilaha illallah, wa ashhadu anna Muhammadan ‘abduhu wa rasuluh',
    meaning: 'I bear witness there is no god but Allah, and that Muhammad is His servant and messenger.',
  },
};

export function guideNote(): string {
  return t(
    'These are the basics most Muslims share. Small details differ between schools — learning alongside someone you trust, or a local imam, helps.',
  );
}

/** Section, title and body in the interface language; the Arabic recitation is never translated. */
function localise(step: GuideStep): GuideStep {
  return { ...step, section: t(step.section), title: t(step.title), body: t(step.body) };
}

export function wuduSteps(): GuideStep[] {
  const s = 'Wudu';
  return ([
    { section: s, title: 'Intend', body: 'Intend in your heart that you are making wudu for prayer. Nothing needs to be said out loud.' },
    { section: s, title: 'Hands', body: 'Say Bismillah, then wash both hands up to the wrists, right hand first.', times: 3, ...PHRASE.bismillah },
    { section: s, title: 'Mouth', body: 'Take water into your mouth with your right hand, swirl it, and spit it out.', times: 3 },
    { section: s, title: 'Nose', body: 'Breathe a little water gently into your nose with your right hand, then blow it out with your left.', times: 3 },
    { section: s, title: 'Face', body: 'Wash your whole face: from the hairline to the chin, and from ear to ear.', times: 3 },
    { section: s, title: 'Arms', body: 'Wash your right arm from the fingertips up to and including the elbow, then the left.', times: 3 },
    { section: s, title: 'Head and ears', body: 'With wet hands, wipe over your head from front to back and back again. Then wipe inside and behind your ears.', times: 1 },
    { section: s, title: 'Feet', body: 'Wash your right foot up to and including the ankle, between the toes too, then the left.', times: 3 },
    { section: s, title: 'Finish', body: 'Your wudu is done. Many people say the testimony of faith afterwards.', ...PHRASE.shahada },
  ] as GuideStep[]).map(localise);
}

export function prayerSteps(prayer: PrayerKey): GuideStep[] {
  const name = prayerMeta(prayer).name;
  const total = RAKAHS[prayer];
  const steps: GuideStep[] = [
    {
      section: 'Before you start',
      title: 'Get ready',
      body: 'Make wudu. Stand on a clean spot, facing the Qibla (the Qibla tab shows the direction).',
    },
    {
      section: 'Before you start',
      title: 'Intend',
      body: t('Intend in your heart: “{name}, {n} rak‘ah.” Nothing needs to be said out loud.', { name, n: total }),
    },
    {
      section: t('Rak‘ah {k} of {n}', { k: 1, n: total }),
      title: 'Begin',
      body: 'Raise your hands to your ears or shoulders and say:',
      ...PHRASE.takbir,
    },
  ];

  for (let k = 1; k <= total; k += 1) {
    const section = t('Rak‘ah {k} of {n}', { k, n: total });
    steps.push({
      section,
      title: 'Stand and recite al-Fatihah',
      body: 'Standing, with your right hand over your left on your chest or below, recite al-Fatihah:',
      ...PHRASE.fatiha,
    });
    if (k <= 2) {
      steps.push({
        section,
        title: 'Recite a short surah',
        body: 'In the first two rak‘ahs, add any other part of the Qur’an. A short one many people know is al-Ikhlas:',
        ...PHRASE.ikhlas,
      });
    }
    steps.push({
      section,
      title: 'Bow (ruku‘)',
      body: 'Say Allahu akbar and bow, hands on your knees, back straight. Then say:',
      times: 3,
      ...PHRASE.ruku,
    });
    steps.push({ section, title: 'Stand up again', body: 'Rise until you are standing straight, saying:', ...PHRASE.rise });
    steps.push({
      section,
      title: 'Prostrate (sujud)',
      body: 'Say Allahu akbar and go down: forehead, nose, palms, knees and toes on the ground. Then say:',
      times: 3,
      ...PHRASE.sujud,
    });
    steps.push({ section, title: 'Sit briefly', body: 'Say Allahu akbar and sit up for a moment. You can say:', ...PHRASE.between });
    steps.push({
      section,
      title: 'Prostrate again',
      body: 'Say Allahu akbar and prostrate a second time, the same way, saying:',
      times: 3,
      ...PHRASE.sujud,
    });

    if (k === 2 && total > 2) {
      steps.push({
        section,
        title: 'Sit for the first tashahhud',
        body: 'Sit up and recite the tashahhud. Then say Allahu akbar and stand for rak‘ah 3.',
        ...PHRASE.tashahhud,
      });
    } else if (k === total) {
      steps.push({ section, title: 'Sit for the final tashahhud', body: 'Sit up and recite the tashahhud:', ...PHRASE.tashahhud });
      steps.push({ section, title: 'Send blessings on the Prophet ﷺ', body: 'Still sitting, continue with:', ...PHRASE.salawat });
      steps.push({
        section,
        title: 'Finish with salam',
        body: 'Turn your head to the right and say the salam, then to the left and say it again.',
        ...PHRASE.salam,
      });
    } else {
      steps.push({
        section,
        title: 'Stand for the next rak‘ah',
        body: t('Say Allahu akbar and stand up for rak‘ah {n}.', { n: k + 1 }),
      });
    }
  }

  steps.push({
    section: 'Done',
    title: t('{name} is complete', { name }),
    body: 'May Allah accept it. Afterwards many people say the tasbih: SubhanAllah, Alhamdulillah and Allahu akbar.',
  });
  return steps.map(localise);
}
