import type { LogStatus } from '../../domain/types';
import { Icon } from './Icons';
import { t } from '../../i18n';

export function StatusMark({
  status,
  future = false,
  size = 30,
}: {
  status?: LogStatus;
  future?: boolean;
  size?: number;
}) {
  if (status === 'ontime') {
    return (
      <span className="statusmark is-ontime" style={{ width: size, height: size }}>
        <Icon name="check" size={size * 0.55} strokeWidth={2.6} />
      </span>
    );
  }

  if (status === 'late') {
    return (
      <span className="statusmark is-late" style={{ width: size, height: size }}>
        <Icon name="clock" size={size * 0.55} strokeWidth={2} />
      </span>
    );
  }

  if (status === 'missed') {
    return (
      <span className="statusmark is-missed" style={{ width: size, height: size }}>
        <Icon name="dash" size={size * 0.6} strokeWidth={2} />
      </span>
    );
  }

  return (
    <span
      className={`statusmark${future ? ' is-future' : ''}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Icon name="circle" size={size * 0.34} strokeWidth={2.2} />
    </span>
  );
}

export function statusText(status?: LogStatus): string {
  if (status === 'ontime') return t('Prayed');
  if (status === 'late') return t('Prayed late');
  if (status === 'missed') return t('Not prayed');
  return t('Not logged');
}
