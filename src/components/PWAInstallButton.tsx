import { useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export function PWAInstallButton({ compact = false }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={`inline-flex items-center gap-1.5 rounded-lg bg-amber-600 font-semibold text-white transition-colors hover:bg-amber-700 whitespace-nowrap shrink-0 ${
          compact ? 'h-9 px-3 text-xs' : 'h-10 px-4 text-xs'
        }`}
      >
        <Download className="h-3.5 w-3.5" />
        Install App
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 ${
            compact ? 'h-9 px-3 text-xs' : 'h-10 px-3.5 text-xs'
          }`}
        >
          <Smartphone className="h-3.5 w-3.5" />
          Install on iPhone
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
              <h3 className="font-display text-base font-bold text-slate-900">
                Install on iPhone / iPad
              </h3>
              <ol className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600">
                <li>
                  1. Tap the <strong className="text-slate-900">Share</strong> button at the bottom
                  of Safari.
                </li>
                <li>
                  2. Scroll down and tap{' '}
                  <strong className="text-slate-900">Add to Home Screen</strong>.
                </li>
                <li>3. Open it from your Home Screen just like a native app.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 h-9 w-full rounded-lg bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
