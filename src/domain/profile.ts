import type { AdaptKey, Applied, FaithKey, NeedKey, NeuroKey, Profile, Settings, ToneKey } from './types';

/*
 * Onboarding answers → suggested settings, each with the reason in the user's
 * own words. Nothing here is a diagnosis or a lock: every suggestion is an
 * ordinary setting the user can see and reverse in Settings → Comfort & support.
 */

export const FAITH_OPTIONS: { id: FaithKey; label: string; hint: string }[] = [
  { id: 'new', label: 'New to Islam', hint: 'Recently took shahada, or just starting' },
  { id: 'returning', label: 'Coming back to practice', hint: 'Picking prayer up again after a while' },
  { id: 'practising', label: 'Practising, and want consistency', hint: 'I know the basics; I want to keep it up' },
  { id: 'learning', label: 'Learning or curious', hint: 'Exploring, or learning for someone else' },
  { id: 'unsaid', label: 'Prefer not to say', hint: '' },
];

export const NEURO_OPTIONS: { id: NeuroKey; label: string; hint: string }[] = [
  { id: 'autistic', label: 'Autistic', hint: 'Diagnosed or self-identified' },
  { id: 'adhd', label: 'ADHD', hint: 'Diagnosed or self-identified' },
  { id: 'neurotypical', label: 'Neurotypical', hint: 'Neither applies to me' },
  { id: 'unsure', label: 'Not sure', hint: 'Still working it out' },
  { id: 'unsaid', label: 'Prefer not to say', hint: '' },
];

export const NEED_OPTIONS: { id: NeedKey; label: string }[] = [
  { id: 'time', label: 'Losing track of time' },
  { id: 'forgetting', label: 'Forgetting to pray, or whether I did' },
  { id: 'transitions', label: 'Switching from one task to another' },
  { id: 'starting', label: 'Getting started' },
  { id: 'sensory', label: 'Busy screens, motion or sound' },
  { id: 'vague', label: 'Vague wording' },
  { id: 'countdown', label: 'Countdowns stress me' },
  { id: 'guilt', label: 'Feeling guilty or pressured' },
  { id: 'howto', label: 'Not sure how to pray some parts' },
];

/** Chips pre-selected from question 2. The user can untick any of them. */
export const NEEDS_BY_NEURO: Partial<Record<NeuroKey, NeedKey[]>> = {
  adhd: ['time', 'forgetting', 'starting'],
  autistic: ['sensory', 'transitions', 'vague'],
};

export function suggestedNeeds(neuro: NeuroKey[]): NeedKey[] {
  const out = new Set<NeedKey>();
  for (const key of neuro) for (const need of NEEDS_BY_NEURO[key] ?? []) out.add(need);
  return NEED_OPTIONS.map((option) => option.id).filter((id) => out.has(id));
}

export function neuroLabel(neuro: NeuroKey[]): string {
  if (neuro.includes('autistic') && neuro.includes('adhd')) return 'AuDHD';
  return neuro.map((key) => NEURO_OPTIONS.find((option) => option.id === key)?.label ?? key).join(', ');
}

/** Every adaptation, in the order it is listed to the user. */
export const ADAPTATIONS: { key: AdaptKey; title: string; on: string; off: string }[] = [
  {
    key: 'calm',
    title: 'Low-stimulation mode',
    on: 'No motion, glow, vibration or background pattern, and softer colours.',
    off: 'The full look, with gentle animation and the star pattern.',
  },
  {
    key: 'coarseTime',
    title: 'Minutes-only countdown',
    on: 'Shows “1 h 05 min” instead of ticking seconds, here and on the widget.',
    off: 'A live countdown to the second.',
  },
  {
    key: 'ladder',
    title: 'Transition warnings',
    on: 'Nudges before each prayer: time to wrap up, then time for wudu, then the adhan.',
    off: 'One pre-alert before each prayer.',
  },
  {
    key: 'catchup',
    title: 'Did-you-pray check-in',
    on: 'After a prayer window closes, asks whether you prayed.',
    off: 'No check-in card; log prayers only when you choose.',
  },
  {
    key: 'literal',
    title: 'Plain wording',
    on: 'Direct, literal sentences with no idioms or hints.',
    off: 'Warmer, more conversational wording.',
  },
  {
    key: 'sound',
    title: 'Notification sound',
    on: 'Reminders make a sound.',
    off: 'Silent reminders.',
  },
  {
    key: 'learn',
    title: 'Learning support',
    on: 'Underlined words explain themselves, plus step-by-step wudu and prayer guides.',
    off: 'No explanations or guides shown.',
  },
  {
    key: 'hasanatTab',
    title: 'Hasanat page',
    on: 'An estimate of rewards, with good-deed ideas for the time you have.',
    off: 'The Hasanat tab is hidden.',
  },
  {
    key: 'tone',
    title: 'Tone of voice',
    on: '',
    off: '',
  },
];

export const TONE_OPTIONS: { value: ToneKey; label: string; hint: string }[] = [
  { value: 'gentle', label: 'Gentle', hint: 'Soft and reassuring, never pushy.' },
  { value: 'encouraging', label: 'Encouraging', hint: 'Warm and upbeat, with a little push.' },
  { value: 'minimal', label: 'Minimal', hint: 'As few words as possible, no celebrations.' },
];

const needLabel = (id: NeedKey) => NEED_OPTIONS.find((option) => option.id === id)?.label ?? id;
const faithLabel = (id: FaithKey) => FAITH_OPTIONS.find((option) => option.id === id)?.label ?? id;

/** The suggestion for every adaptation, with reasons. Pure: same answers, same result. */
export function recommend(answers: Pick<Profile, 'faith' | 'neuro' | 'needs'>): Applied[] {
  const needs = new Set(answers.needs);
  const faith = answers.faith;
  const why = (...ids: NeedKey[]) => ids.filter((id) => needs.has(id)).map(needLabel);

  const ladderWhy = why('time', 'transitions', 'starting');
  const guiltOnly = needs.has('guilt') && !needs.has('forgetting');

  const learnWhy = [...why('howto')];
  if (faith === 'new' || faith === 'learning' || faith === 'returning') learnWhy.push(faithLabel(faith));

  let tone: ToneKey = 'gentle';
  let toneWhy: string[] = [];
  if (needs.has('guilt')) {
    tone = 'gentle';
    toneWhy = why('guilt');
  } else if (faith === 'practising') {
    tone = 'encouraging';
    toneWhy = [faithLabel(faith)];
  } else if (faith === 'new' || faith === 'returning') {
    tone = 'gentle';
    toneWhy = [faithLabel(faith)];
  }

  return [
    { key: 'calm', value: needs.has('sensory'), because: why('sensory') },
    { key: 'coarseTime', value: needs.has('countdown'), because: why('countdown') },
    { key: 'ladder', value: ladderWhy.length > 0, because: ladderWhy },
    { key: 'catchup', value: !guiltOnly, because: guiltOnly ? why('guilt') : why('forgetting') },
    { key: 'literal', value: needs.has('vague'), because: why('vague') },
    { key: 'sound', value: !needs.has('sensory'), because: why('sensory') },
    { key: 'learn', value: learnWhy.length > 0, because: learnWhy },
    { key: 'hasanatTab', value: !needs.has('guilt'), because: why('guilt') },
    { key: 'tone', value: tone, because: toneWhy },
  ];
}

/**
 * Settings to write for a set of suggestions. Adaptations the user changed by
 * hand are left alone unless `force` (Reset to suggestions).
 */
export function patchFor(applied: Applied[], overridden: AdaptKey[] = [], force = false): Partial<Settings> {
  const patch: Record<string, unknown> = {};
  for (const item of applied) {
    if (!force && overridden.includes(item.key)) continue;
    patch[item.key] = item.value;
  }
  return patch as Partial<Settings>;
}

export function appliedFor(profile: Profile | null, key: AdaptKey): Applied | undefined {
  return profile?.applied.find((item) => item.key === key);
}
