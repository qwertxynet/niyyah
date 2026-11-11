import { actions, useStore } from '../../domain/store';

/**
 * One small button that switches between English and Arabic, labelled in the
 * language it switches to, so it can be found by someone who reads only that
 * one. Shown at the top of first-run setup; Settings has the full control.
 */
export function LanguageSwitch({ onChange }: { onChange?: (language: 'en' | 'ar') => void }) {
  const { settings } = useStore();
  const next = settings.language === 'ar' ? 'en' : 'ar';
  return (
    <button
      type="button"
      className="lang-switch"
      lang={next}
      onClick={() => {
        actions.updateSettings({ language: next });
        onChange?.(next);
      }}
    >
      {next === 'ar' ? 'العربية' : 'English'}
    </button>
  );
}
