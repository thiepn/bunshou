import React, { useEffect, useId, useRef, useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    install,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (showGuideModal && !dialog.open) {
      dialog.showModal();
    } else if (!showGuideModal && dialog.open) {
      dialog.close();
    }
  }, [showGuideModal]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      setShowGuideModal(false);
    };

    dialog.addEventListener('close', handleClose);
    return () => {
      dialog.removeEventListener('close', handleClose);
    };
  }, []);

  const handleDialogClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    if ('closedBy' in HTMLDialogElement.prototype) return;
    const dialog = dialogRef.current;
    if (!dialog || event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    const isDialogContent =
      rect.top <= event.clientY &&
      event.clientY <= rect.top + rect.height &&
      rect.left <= event.clientX &&
      event.clientX <= rect.left + rect.width;
    if (!isDialogContent) {
      dialog.close();
    }
  };

  if (isInstalled) {
    if (compact) return null;
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
        <span>印 Installed as Standalone App</span>
      </span>
    );
  }

  return (
    <>
      {isInstallable ? (
        <button
          type="button"
          onClick={install}
          data-testid="pwa-install-button"
          className={
            compact
              ? 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#C83E2B] hover:bg-[#B03322] text-white text-xs font-semibold transition-colors cursor-pointer shrink-0'
              : 'inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C83E2B] hover:bg-[#B03322] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0'
          }
        >
          <Download className="w-3.5 h-3.5" />
          <span>{compact ? 'Install App' : 'Install Bunshō App (アプリ)'}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setShowGuideModal(true)}
          data-testid="pwa-install-guide-button"
          className={
            compact
              ? 'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#DFD6C7] dark:border-slate-700 bg-[#FAF6EE] dark:bg-slate-800 text-stone-700 dark:text-slate-200 hover:border-[#C83E2B] text-xs font-semibold transition-colors cursor-pointer shrink-0'
              : 'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#DFD6C7] dark:border-slate-700 bg-[#FAF6EE] dark:bg-slate-800 text-stone-800 dark:text-slate-100 hover:border-[#C83E2B] text-xs font-semibold transition-colors cursor-pointer shrink-0'
          }
        >
          <Smartphone className="w-3.5 h-3.5 text-[#C83E2B] dark:text-rose-400" />
          <span>{isIOS ? 'Install on iOS' : compact ? 'Install' : 'Install Offline App'}</span>
        </button>
      )}

      {showGuideModal && (
        <dialog
          ref={dialogRef}
          aria-labelledby={titleId}
          onClick={handleDialogClick}
          {...({ closedby: 'any' } as Record<string, string>)}
          className="w-[calc(100%-2rem)] max-w-md p-0 bg-transparent border-0 rounded-2xl shadow-xl"
        >
          <div className="w-full rounded-2xl bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 p-6 text-stone-900 dark:text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#C83E2B] dark:text-rose-400">
                  Offline Progressive Web App · 携帯アプリ
                </div>
                <h2 id={titleId} className="mt-1 font-display text-lg font-bold text-stone-900 dark:text-white">
                  Install Bunshō (文章) on Your Device
                </h2>
              </div>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                aria-label="Close install instructions"
                className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-stone-600 dark:text-slate-300 leading-relaxed">
              <div className="p-3.5 rounded-xl bg-[#F4EFE6] dark:bg-slate-900 border border-[#E4DBCD] dark:border-slate-800">
                <div className="font-bold text-stone-900 dark:text-white">
                  iPhone & iPad (iOS Safari)
                </div>
                <p className="mt-1">
                  1. Tap the <strong>Share</strong> icon in the Safari toolbar.
                  <br />
                  2. Scroll down and select <strong>Add to Home Screen (ホーム画面に追加)</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F4EFE6] dark:bg-slate-900 border border-[#E4DBCD] dark:border-slate-800">
                <div className="font-bold text-stone-900 dark:text-white">
                  Desktop Chrome / Edge & Android
                </div>
                <p className="mt-1">
                  Click the <strong>Install Bunshō</strong> icon in the browser address bar (or open
                  the browser menu and choose <strong>Install App</strong>) to launch in a dedicated
                  offline-capable window.
                </p>
              </div>
            </div>

            <button
              type="button"
              autoFocus
              onClick={() => dialogRef.current?.close()}
              className="mt-5 w-full py-2.5 rounded-xl bg-[#C83E2B] hover:bg-[#B03322] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Got It (閉じる)
            </button>
          </div>
        </dialog>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-16 md:bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-[#1C1917] dark:bg-amber-950 border border-amber-500/60 px-3.5 py-2 text-xs font-semibold text-[#F7F3EB] shadow-lg"
    >
      <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span>オフライン · Offline Mode — Studying from local Washi cache</span>
    </div>
  );
};
