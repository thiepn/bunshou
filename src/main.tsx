import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
}

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F7F3EB] text-[#1C1917] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#FCFBF7] border border-[#DFD6C7] rounded-2xl p-6 text-center shadow-sm">
            <div className="font-jp-serif text-2xl font-bold text-[#C83E2B]">Bunshō 文章</div>
            <p className="mt-2 text-sm text-stone-600">
              The study workspace encountered a display hiccup and has been safely paused.
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-[#C83E2B] text-white text-xs font-bold cursor-pointer"
            >
              Reload Study Workspace
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Safely manage Service Worker registration so cross-origin preview iframes
// never throw unhandled SecurityError / DOMException promise rejections.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    try {
      if (import.meta.env.DEV) {
        navigator.serviceWorker
          .getRegistrations()
          .then((registrations) => {
            for (const reg of registrations) {
              reg.unregister().catch(() => {});
            }
          })
          .catch(() => {});
      } else if (import.meta.env.PROD) {
        navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
      }
    } catch {
      // Ignore sandboxed iframe serviceWorker restrictions
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);
