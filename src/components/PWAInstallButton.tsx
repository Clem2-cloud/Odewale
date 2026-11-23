import { Download, Monitor, Smartphone, WifiOff, X } from 'lucide-react';
import React, { useState } from 'react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleAction = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    setShowGuide(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleAction}
        className={
          compact
            ? 'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-opacity hover:opacity-90 min-h-[40px]'
            : 'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-opacity hover:opacity-90 min-h-[44px]'
        }
        style={{
          backgroundColor: 'var(--oc-accent)',
          color: 'var(--oc-accent-fg)',
        }}
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>{isIOS ? 'Install on iPhone / iPad' : 'Install Open Circle App'}</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4">
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-xl"
            style={{
              backgroundColor: 'var(--oc-surface)',
              color: 'var(--oc-text)',
              border: '1px solid var(--oc-border)',
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-lg font-bold">
                  Install Open Circle on Your Device
                </h3>
                <p className="text-sm mt-1" style={{ color: 'var(--oc-muted)' }}>
                  Works natively as a standalone app on Windows, iOS, and Android.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close install guide"
                className="p-2 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center"
                style={{ color: 'var(--oc-muted)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-sm">
              <div
                className="p-4 rounded-xl"
                style={{
                  backgroundColor: 'var(--oc-surface-alt)',
                  border: '1px solid var(--oc-border)',
                }}
              >
                <div className="flex items-center gap-2 font-semibold">
                  <Smartphone className="w-4 h-4" style={{ color: 'var(--oc-accent)' }} />
                  <span>iPhone & iPad (iOS Safari)</span>
                </div>
                <ol className="mt-2 space-y-1.5 list-decimal list-inside" style={{ color: 'var(--oc-muted)' }}>
                  <li>Open Open Circle in Safari.</li>
                  <li>Tap the <strong>Share</strong> icon in the bottom toolbar.</li>
                  <li>Scroll and tap <strong>Add to Home Screen</strong>.</li>
                </ol>
              </div>

              <div
                className="p-4 rounded-xl"
                style={{
                  backgroundColor: 'var(--oc-surface-alt)',
                  border: '1px solid var(--oc-border)',
                }}
              >
                <div className="flex items-center gap-2 font-semibold">
                  <Smartphone className="w-4 h-4" style={{ color: 'var(--oc-accent)' }} />
                  <span>Android (Chrome / Edge)</span>
                </div>
                <p className="mt-1.5" style={{ color: 'var(--oc-muted)' }}>
                  {isAndroid
                    ? 'Tap your browser menu (three dots) and select "Install app" or "Add to Home screen".'
                    : 'Open this link in Chrome on Android and tap "Install app" in the menu to add it directly to the app drawer.'}
                </p>
              </div>

              <div
                className="p-4 rounded-xl"
                style={{
                  backgroundColor: 'var(--oc-surface-alt)',
                  border: '1px solid var(--oc-border)',
                }}
              >
                <div className="flex items-center gap-2 font-semibold">
                  <Monitor className="w-4 h-4" style={{ color: 'var(--oc-accent)' }} />
                  <span>Windows (Edge / Chrome)</span>
                </div>
                <p className="mt-1.5" style={{ color: 'var(--oc-muted)' }}>
                  Click the <strong>Install Open Circle</strong> icon on the right side of your browser address bar, or open browser menu &gt; Apps &gt; Install this site as an app.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full py-2.5 rounded-xl text-sm font-semibold min-h-[44px]"
              style={{
                backgroundColor: 'var(--oc-accent)',
                color: 'var(--oc-accent-fg)',
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      className="fixed bottom-20 md:bottom-5 left-4 z-50 flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold shadow-lg"
      style={{
        backgroundColor: '#b45309',
        color: '#ffffff',
      }}
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Offline Mode — Viewing cached Open Circle content</span>
    </div>
  );
};
