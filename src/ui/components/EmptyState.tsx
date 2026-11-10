import type { ReactNode } from 'react';

/** A small mihrab arch with a crescent — the app icon's shape — above a message. */
export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <svg viewBox="0 0 84 96" fill="none" aria-hidden="true">
        <path d="M8 92V42a34 34 0 0 1 68 0v50" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M2 92h80" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        <path
          d="M47 36.5a13 13 0 1 0 8.5 18.3 10.4 10.4 0 0 1-8.5-18.3Z"
          fill="currentColor"
          opacity="0.85"
        />
        <circle cx="62" cy="30" r="2.4" fill="currentColor" />
      </svg>
      <h3>{title}</h3>
      {children ? <p>{children}</p> : null}
      {action}
    </div>
  );
}
