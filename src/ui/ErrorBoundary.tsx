import { Component, type ErrorInfo, type ReactNode } from 'react';
import { t } from '../i18n';
import { EmptyState } from './components/EmptyState';

/*
 * If a screen crashes, show a calm message instead of a blank page. Nothing is
 * sent anywhere: "Copy details" puts a short report on the clipboard for the
 * user to share if they choose.
 */

const recent: string[] = [];

function remember(kind: string, error: unknown) {
  const text = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ''}` : String(error);
  recent.push(`[${kind}] ${new Date().toISOString()}\n${text}`);
  if (recent.length > 5) recent.shift();
}

/** Errors outside React rendering (event handlers, timers, promises) are kept for the report. */
export function installGlobalErrorHandlers() {
  window.addEventListener('error', (event) => remember('error', event.error ?? event.message));
  window.addEventListener('unhandledrejection', (event) => remember('promise', event.reason));
}

function report(error: Error | null, info: string): string {
  return [
    `Niyyah ${__APP_VERSION__} · ${navigator.userAgent}`,
    `Language: ${document.documentElement.lang}`,
    error ? `${error.name}: ${error.message}\n${error.stack ?? ''}` : '',
    info ? `Component stack:${info}` : '',
    recent.length ? `Earlier errors:\n${recent.join('\n\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

interface State {
  error: Error | null;
  info: string;
  copied: boolean;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, info: '', copied: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    remember('render', error);
    this.setState({ info: info.componentStack ?? '' });
    console.error(error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="shell crash" role="alert">
        <EmptyState
          title={t('Something went wrong')}
          action={
            <div className="crash-actions">
              <button type="button" className="btn btn-solid" onClick={() => window.location.reload()}>
                {t('Reload Niyyah')}
              </button>
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() => {
                  void navigator.clipboard
                    ?.writeText(report(this.state.error, this.state.info))
                    .then(() => this.setState({ copied: true }))
                    .catch(() => undefined);
                }}
              >
                {this.state.copied ? t('Copied') : t('Copy details')}
              </button>
            </div>
          }
        >
          {t('Your prayers, journal and settings are safe on this device. Reloading usually fixes it.')}
        </EmptyState>
      </div>
    );
  }
}
