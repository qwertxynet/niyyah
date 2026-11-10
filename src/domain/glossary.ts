/*
 * Plain-language explanations shown when "Learning support" is on. Written for
 * someone new: short, literal, and free of further jargon where possible.
 */

export interface Term {
  word: string;
  arabic: string;
  meaning: string;
}

export const GLOSSARY = {
  salah: {
    word: 'Salah',
    arabic: 'صَلَاة',
    meaning: 'The five daily prayers. Each one is a set of standing, bowing, prostrating and sitting, with set words.',
  },
  rakah: {
    word: 'Rak‘ah',
    arabic: 'رَكْعَة',
    meaning:
      'One cycle of the prayer: stand and recite, bow, stand up, prostrate twice. Fajr has 2, Maghrib 3, and Dhuhr, Asr and Isha have 4.',
  },
  wudu: {
    word: 'Wudu',
    arabic: 'وُضُوء',
    meaning: 'Washing certain parts of the body in a set order before praying. Niyyah has a step-by-step guide.',
  },
  adhan: {
    word: 'Adhan',
    arabic: 'أَذَان',
    meaning: 'The call to prayer. In Niyyah, it marks the moment a prayer’s time begins.',
  },
  qada: {
    word: 'Qada',
    arabic: 'قَضَاء',
    meaning: 'Making up a prayer after its time has passed. Niyyah can keep a quiet count of these if you want.',
  },
  jamaah: {
    word: 'Jama‘ah',
    arabic: 'جَمَاعَة',
    meaning: 'Praying together in a group behind one person who leads, for example at a mosque.',
  },
  dhikr: {
    word: 'Dhikr',
    arabic: 'ذِكْر',
    meaning: 'Remembering Allah by repeating short phrases, such as SubhanAllah (“Glory be to Allah”).',
  },
  tasbih: {
    word: 'Tasbih',
    arabic: 'تَسْبِيح',
    meaning: 'Saying SubhanAllah, Alhamdulillah and Allahu akbar, often 33, 33 and 34 times after a prayer.',
  },
  surah: {
    word: 'Surah',
    arabic: 'سُورَة',
    meaning: 'A chapter of the Qur’an. There are 114.',
  },
  ayah: {
    word: 'Ayah',
    arabic: 'آيَة',
    meaning: 'A verse of the Qur’an. Each surah is made of ayahs.',
  },
  juz: {
    word: 'Juz’',
    arabic: 'جُزْء',
    meaning: 'One of 30 roughly equal parts of the Qur’an. Reading one a day finishes the Qur’an in a month.',
  },
  fatiha: {
    word: 'Al-Fatihah',
    arabic: 'ٱلْفَاتِحَة',
    meaning: 'The first surah of the Qur’an, 7 verses long. It is recited in every rak‘ah of every prayer.',
  },
  madhab: {
    word: 'Madhab',
    arabic: 'مَذْهَب',
    meaning:
      'A school of Islamic law. For prayer times it only changes when Asr begins: Hanafi starts Asr a little later.',
  },
  hasanat: {
    word: 'Hasanat',
    arabic: 'حَسَنَات',
    meaning: 'Good deeds, and the reward written for them. Only Allah knows their true weight.',
  },
  fajr: { word: 'Fajr', arabic: 'ٱلْفَجْر', meaning: 'The dawn prayer, from first light until sunrise. 2 rak‘ah.' },
  dhuhr: { word: 'Dhuhr', arabic: 'ٱلظُّهْر', meaning: 'The midday prayer, just after the sun passes its highest point. 4 rak‘ah.' },
  asr: { word: 'Asr', arabic: 'ٱلْعَصْر', meaning: 'The afternoon prayer. 4 rak‘ah.' },
  maghrib: { word: 'Maghrib', arabic: 'ٱلْمَغْرِب', meaning: 'The sunset prayer, just after the sun has set. 3 rak‘ah.' },
  isha: { word: 'Isha', arabic: 'ٱلْعِشَاء', meaning: 'The night prayer, once the sky is fully dark. 4 rak‘ah.' },
} satisfies Record<string, Term>;

export type TermId = keyof typeof GLOSSARY;
