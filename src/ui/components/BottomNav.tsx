import { useLayoutEffect, useRef, useState } from 'react';
import { t } from '../../i18n';
import { Icon, type IconName } from './Icons';

export type Tab = 'today' | 'qibla' | 'hasanat' | 'week' | 'settings';

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'today', label: 'Today', icon: 'sun' },
  { id: 'qibla', label: 'Qibla', icon: 'compass' },
  { id: 'hasanat', label: 'Hasanat', icon: 'star' },
  { id: 'week', label: 'Journal', icon: 'book' },
  { id: 'settings', label: 'Settings', icon: 'sliders' },
];

export function BottomNav({
  tab,
  onChange,
  hidden = [],
}: {
  tab: Tab;
  onChange: (next: Tab) => void;
  /** Tabs switched off in Settings → Comfort & support. */
  hidden?: Tab[];
}) {
  const navRef = useRef<HTMLElement>(null);
  // One highlight that glides between tabs instead of jumping.
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
  const tabs = TABS.filter((entry) => !hidden.includes(entry.id));

  useLayoutEffect(() => {
    const measure = () => {
      const active = navRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
      setPill(active ? { left: active.offsetLeft, width: active.offsetWidth } : null);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [tab, tabs.length]);

  return (
    <nav className={pill ? 'nav has-pill' : 'nav'} aria-label={t('Main')} ref={navRef}>
      {pill ? (
        <span
          className="nav-pill"
          aria-hidden="true"
          style={{ width: pill.width, transform: `translateX(${pill.left}px)` }}
        />
      ) : null}
      {tabs.map((entry) => (
        <button
          key={entry.id}
          type="button"
          className="nav-btn"
          aria-current={tab === entry.id ? 'page' : undefined}
          onClick={() => onChange(entry.id)}
        >
          <Icon name={entry.icon} size={19} />
          <span>{t(entry.label)}</span>
        </button>
      ))}
    </nav>
  );
}
