import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icons';
import { t } from '../../i18n';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  labelledBy?: string;
}

export function Sheet({ open, onClose, title, children, labelledBy }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'button, select, input, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    }, 60);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
      window.clearTimeout(timer);
    };
  }, [open, onClose]);

  if (!open) return null;

  // Portal to <body> so a sheet opened from inside an animated screen is not
  // trapped by that screen's transform.
  return createPortal(
    <div className="sheet-backdrop" onMouseDown={onClose}>
      <div
        className="sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-labelledby={labelledBy}
        ref={panelRef}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sheet-grab" aria-hidden="true" />
        <button type="button" className="sheet-close" onClick={onClose} aria-label={t('Close')}>
          <Icon name="close" size={18} />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
