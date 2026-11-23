import { Check, Copy, Link2, Mail, MessageSquareShare, Monitor, QrCode, Smartphone, X } from 'lucide-react';
import QRCode from 'qrcode';
import React, { useEffect, useState } from 'react';
import type { AuthUser } from '../../shared/types';
import { PWAInstallButton } from './PWAInstallButton';

interface ShareAppModalProps {
  currentUser: AuthUser | null;
  onSaveCustomApkUrl: (url: string) => Promise<void>;
  onClose: () => void;
}

export const ShareAppModal: React.FC<ShareAppModalProps> = ({
  currentUser,
  onSaveCustomApkUrl,
  onClose,
}) => {
  const appBaseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const [customApkUrl, setCustomApkUrl] = useState(currentUser?.customApkUrl || '');
  const [savingApk, setSavingApk] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [activePlatform, setActivePlatform] = useState<'android' | 'ios' | 'windows'>('android');

  const activeShareLink = customApkUrl.trim() || appBaseUrl;

  useEffect(() => {
    QRCode.toDataURL(activeShareLink, {
      width: 220,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [activeShareLink]);

  const shareMessage = customApkUrl.trim()
    ? `Join me on Open Circle! Install the Android APK here: ${customApkUrl.trim()} — or open on Windows, iOS & Android here: ${appBaseUrl}`
    : `Join me on Open Circle — a safe app for Windows, iOS, and Android to share helpful pictures, stories, and short videos worldwide. Open & install here: ${appBaseUrl}`;

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
  const gmailHref = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(
    'Try Open Circle — App Link & Install'
  )}&body=${encodeURIComponent(shareMessage)}`;
  const mailtoHref = `mailto:?subject=${encodeURIComponent(
    'Try Open Circle — App Link & Install'
  )}&body=${encodeURIComponent(shareMessage)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeShareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // ignore clipboard restriction
    }
  };

  const handleSaveApk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSavingApk(true);
    setSavedNotice('');
    try {
      await onSaveCustomApkUrl(customApkUrl.trim());
      setSavedNotice('Share link updated.');
    } finally {
      setSavingApk(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        className="w-full max-w-xl rounded-2xl p-6 shadow-xl my-auto"
        style={{
          backgroundColor: 'var(--oc-surface)',
          color: 'var(--oc-text)',
          border: '1px solid var(--oc-border)',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold">Share Open Circle & Install Link</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--oc-muted)' }}>
              Send Open Circle via WhatsApp or Google Mail so anyone can use it on Android, iOS, or Windows.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share dialog"
            className="p-2 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center"
            style={{ color: 'var(--oc-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Share Link + QR */}
        <div
          className="mt-5 p-4 rounded-xl flex flex-col sm:flex-row items-center gap-4"
          style={{
            backgroundColor: 'var(--oc-surface-alt)',
            border: '1px solid var(--oc-border)',
          }}
        >
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Scan QR code to open Open Circle"
              className="w-28 h-28 rounded-xl bg-white p-1.5 shrink-0"
            />
          ) : (
            <div className="w-28 h-28 rounded-xl bg-white flex items-center justify-center shrink-0 text-slate-500">
              <QrCode className="w-8 h-8" />
            </div>
          )}

          <div className="flex-1 min-w-0 w-full space-y-2.5">
            <div className="text-xs font-semibold">Live Shareable App Link</div>
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
              style={{
                backgroundColor: 'var(--oc-surface)',
                border: '1px solid var(--oc-border)',
              }}
            >
              <Link2 className="w-4 h-4 shrink-0" style={{ color: 'var(--oc-accent)' }} />
              <span className="truncate flex-1 font-mono-num">{activeShareLink}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold shrink-0"
                style={{
                  backgroundColor: 'var(--oc-accent-soft)',
                  color: 'var(--oc-accent)',
                }}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold min-h-[42px] transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#15803d', color: '#ffffff' }}
              >
                <MessageSquareShare className="w-4 h-4 shrink-0" />
                <span>Share via WhatsApp</span>
              </a>

              <a
                href={gmailHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold min-h-[42px] transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#b91c1c', color: '#ffffff' }}
              >
                <Mail className="w-4 h-4 shrink-0" />
                <span>Share via Google Mail</span>
              </a>
            </div>
            <div className="text-[11px]" style={{ color: 'var(--oc-muted)' }}>
              Prefer your device mail app?{' '}
              <a href={mailtoHref} className="underline font-semibold" style={{ color: 'var(--oc-accent)' }}>
                Open default Mail composer
              </a>
            </div>
          </div>
        </div>

        {/* Optional Custom Hosted APK URL */}
        <form onSubmit={handleSaveApk} className="mt-4 space-y-2">
          <label className="block text-xs font-semibold">
            Optional Hosted Android APK Download Link (if you package this PWA with PWABuilder / Bubblewrap)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={customApkUrl}
              onChange={(e) => setCustomApkUrl(e.target.value)}
              placeholder="https://example.com/open-circle.apk (leave blank to share cross-platform app link)"
              className="flex-1 px-3 py-2 rounded-xl text-xs outline-none min-h-[40px]"
              style={{
                backgroundColor: 'var(--oc-surface-alt)',
                border: '1px solid var(--oc-border)',
                color: 'var(--oc-text)',
              }}
            />
            {currentUser && (
              <button
                type="submit"
                disabled={savingApk}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold min-h-[40px] shrink-0"
                style={{
                  backgroundColor: 'var(--oc-accent)',
                  color: 'var(--oc-accent-fg)',
                }}
              >
                {savingApk ? 'Saving...' : 'Save URL'}
              </button>
            )}
          </div>
          {savedNotice && (
            <p className="text-xs font-medium" style={{ color: 'var(--oc-accent)' }}>
              {savedNotice}
            </p>
          )}
        </form>

        {/* Cross-Platform Install Instructions */}
        <div className="mt-5">
          <div
            className="grid grid-cols-3 gap-1 p-1 rounded-xl"
            style={{ backgroundColor: 'var(--oc-surface-alt)' }}
          >
            {(
              [
                { id: 'android', label: 'Android', Icon: Smartphone },
                { id: 'ios', label: 'iPhone / iOS', Icon: Smartphone },
                { id: 'windows', label: 'Windows', Icon: Monitor },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActivePlatform(id)}
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold min-h-[38px]"
                style={
                  activePlatform === id
                    ? { backgroundColor: 'var(--oc-surface)', color: 'var(--oc-text)' }
                    : { color: 'var(--oc-muted)' }
                }
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div
            className="mt-3 p-4 rounded-xl text-xs leading-relaxed"
            style={{
              backgroundColor: 'var(--oc-surface-alt)',
              border: '1px solid var(--oc-border)',
              color: 'var(--oc-muted)',
            }}
          >
            {activePlatform === 'android' && (
              <p>
                Open the shared link in <strong>Chrome on Android</strong> and tap{' '}
                <strong>Install App</strong> (or tap the three-dot menu &rarr; Add to Home screen). Open Circle
                installs as a full-screen standalone app with offline support—or paste a signed{' '}
                <code className="font-mono-num">.apk</code> URL above if you wrap it via PWABuilder.
              </p>
            )}
            {activePlatform === 'ios' && (
              <p>
                Open the shared link in <strong>Safari on iPhone or iPad</strong>, tap the{' '}
                <strong>Share</strong> button, and choose <strong>Add to Home Screen</strong>. It launches
                full-screen like a native iOS app.
              </p>
            )}
            {activePlatform === 'windows' && (
              <p>
                Open the shared link in <strong>Microsoft Edge or Google Chrome on Windows</strong> and click the{' '}
                <strong>Install Open Circle</strong> button in the address bar (or below) to pin it to your
                Start Menu and Taskbar.
              </p>
            )}
          </div>

          <div className="mt-4">
            <PWAInstallButton />
          </div>
        </div>
      </div>
    </div>
  );
};
