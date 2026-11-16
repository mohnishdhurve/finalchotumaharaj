import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChefHat,
  Copy,
  ExternalLink,
  Monitor,
  Smartphone,
  X,
} from 'lucide-react';
import QRCode from 'qrcode';
import type { PresenceState } from '../types.ts';
import { PWAInstallButton } from './PWAInstallButton.tsx';

interface ChefConnectModalProps {
  isOpen: boolean;
  presence: PresenceState;
  onClose: () => void;
  onOpenKitchenHere: () => void;
}

export function ChefConnectModal({
  isOpen,
  presence,
  onClose,
  onOpenKitchenHere,
}: ChefConnectModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const kitchenUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    url.searchParams.set('role', 'kitchen');
    return url.toString();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !kitchenUrl) return;
    let cancelled = false;
    QRCode.toDataURL(kitchenUrl, {
      width: 220,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('');
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, kitchenUrl]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(kitchenUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chef-connect-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h2 id="chef-connect-title" className="font-display text-base font-bold text-slate-900">
                Chef Mobile &amp; App Setup
              </h2>
              <p className="text-xs text-slate-500">
                Connect Chef&apos;s phone for live orders &amp; two-way alerts
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          {/* Live Device Sync Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <Monitor className="h-3.5 w-3.5 text-slate-700" />
                Counter PC
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-900">
                <span
                  className={`h-2 w-2 rounded-full ${
                    presence.counterCount > 0 ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                />
                {presence.counterCount} Online
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <ChefHat className="h-3.5 w-3.5 text-amber-600" />
                Chef Mobile
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-900">
                <span
                  className={`h-2 w-2 rounded-full ${
                    presence.kitchenCount > 0 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                {presence.kitchenCount > 0
                  ? `${presence.kitchenCount} Connected`
                  : 'Waiting to scan'}
              </div>
            </div>
          </div>

          {/* QR Code + Shareable Chef Link */}
          <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:flex-row">
            <div className="flex h-40 w-40 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-2">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR code to open Kitchen Display on Chef mobile"
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-xs text-slate-400">Generating QR...</span>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-2.5">
              <h3 className="font-display text-sm font-bold text-slate-900">
                1. Scan on Chef&apos;s Phone
              </h3>
              <p className="text-xs leading-relaxed text-slate-600">
                Scan this QR code with the chef&apos;s phone camera or send the link on WhatsApp. It
                opens directly in <strong>Chef Mobile Kitchen Mode</strong>.
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={kitchenUrl}
                  className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-[11px] text-slate-700"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          {/* Install as Mobile App (PWA) */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <h3 className="font-display text-sm font-bold text-slate-900">
                  2. Install on Phone Home Screen (No APK Needed)
                </h3>
                <p className="text-xs leading-relaxed text-slate-700">
                  This app is a full <strong>Installable Mobile App (PWA)</strong>. On Android
                  Chrome, tap <strong>Install App</strong> (or Chrome menu{' '}
                  <span className="font-semibold">⋮ → Add to Home screen / Install app</span>). On
                  iPhone Safari, tap <span className="font-semibold">Share → Add to Home Screen</span>.
                </p>
              </div>
              <PWAInstallButton compact />
            </div>
          </div>

          {/* Two-Way Notification Info */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
            <p className="font-semibold text-slate-900">Two-Way Live Notifications:</p>
            <ul className="mt-1.5 space-y-1">
              <li>
                • <strong>Counter → Chef Mobile:</strong> New orders chime, vibrate, and pop up
                instantly on the chef&apos;s phone.
              </li>
              <li>
                • <strong>Chef Mobile → Counter PC:</strong> When the chef taps{' '}
                <em>Start Cooking</em> or <em>Mark Ready</em>, the counter PC immediately chimes and
                alerts the cashier.
              </li>
            </ul>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => {
                onOpenKitchenHere();
                onClose();
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Switch This Screen to Kitchen Mode
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
