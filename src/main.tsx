import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { registerServiceWorker } from './pwa';
import { ErrorBoundary, installGlobalErrorHandlers } from './ui/ErrorBoundary';
import './styles.css';

installGlobalErrorHandlers();

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}

registerServiceWorker();
