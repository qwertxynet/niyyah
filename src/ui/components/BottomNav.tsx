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
  return (
    <nav className="nav" aria-label="Main">
      {TABS.filter((entry) => !hidden.includes(entry.id)).map((entry) => (
        <button
          key={entry.id}
          type="button"
          className="nav-btn"
          aria-current={tab === entry.id ? 'page' : undefined}
          onClick={() => onChange(entry.id)}
        >
          <Icon name={entry.icon} size={19} />
          <span>{entry.label}</span>
        </button>
      ))}
    </nav>
  );
}
