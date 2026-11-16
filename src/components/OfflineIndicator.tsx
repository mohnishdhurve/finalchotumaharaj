import { useOnlineStatus } from '../hooks/useOnlineStatus.ts';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg">
      <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
      Offline Mode — Cached menu active. Waiting to reconnect...
    </div>
  );
}
