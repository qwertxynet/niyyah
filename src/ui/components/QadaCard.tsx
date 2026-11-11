import { actions } from '../../domain/store';
import { Icon } from './Icons';
import { t } from '../../i18n';

export function QadaCard({ count }: { count: number }) {
  return (
    <div className="qada">
      <div>
        <div className="qada-count tnum">{count}</div>
        <div className="qada-label">
          {count === 0
            ? t('Nothing set aside to make up.')
            : count === 1
              ? t('prayer set aside to make up')
              : t('prayers set aside to make up')}
        </div>
        <div className="setting-hint" style={{ marginTop: 4 }}>
          {t('Counted gently. Add or settle one whenever you like.')}
        </div>
      </div>
      <div className="stepper">
        <button
          type="button"
          onClick={() => actions.setQada(count - 1)}
          disabled={count === 0}
          aria-label={t('One fewer to make up')}
        >
          <Icon name="minus" size={16} strokeWidth={2.2} />
        </button>
        <button type="button" onClick={() => actions.setQada(count + 1)} aria-label={t('Add one to make up')}>
          <Icon name="plus" size={16} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}
