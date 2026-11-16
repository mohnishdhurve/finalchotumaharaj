import { Bell, CheckCircle2, Flame, Printer, X, XCircle } from 'lucide-react';
import type { DeviceNotification, Order, OrderStatus } from '../types.ts';

interface NotificationCenterProps {
  notifications: DeviceNotification[];
  isKitchenView: boolean;
  onDismiss: (id: string) => void;
  onOpenReceipt: (order: Order) => void;
  onUpdateStatus: (orderId: number, status: OrderStatus) => Promise<void>;
}

export function NotificationCenter({
  notifications,
  isKitchenView,
  onDismiss,
  onOpenReceipt,
  onUpdateStatus,
}: NotificationCenterProps) {
  if (notifications.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed top-20 right-4 left-4 z-40 flex flex-col items-end gap-2.5 sm:left-auto sm:w-96"
      aria-live="polite"
    >
      {notifications.map((note) => {
        const styles =
          note.tone === 'new-order'
            ? {
                border: 'border-amber-300 bg-amber-50',
                iconBg: 'bg-amber-600 text-white',
                Icon: Bell,
              }
            : note.tone === 'ready'
            ? {
                border: 'border-emerald-300 bg-emerald-50',
                iconBg: 'bg-emerald-600 text-white',
                Icon: CheckCircle2,
              }
            : note.tone === 'cooking'
            ? {
                border: 'border-blue-200 bg-blue-50',
                iconBg: 'bg-blue-600 text-white',
                Icon: Flame,
              }
            : note.tone === 'cancelled'
            ? {
                border: 'border-red-200 bg-red-50',
                iconBg: 'bg-red-600 text-white',
                Icon: XCircle,
              }
            : {
                border: 'border-slate-200 bg-white',
                iconBg: 'bg-slate-800 text-white',
                Icon: CheckCircle2,
              };

        const Icon = styles.Icon;

        return (
          <div
            key={note.id}
            className={`pointer-events-auto w-full rounded-xl border p-3.5 shadow-lg transition-all ${styles.border}`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${styles.iconBg}`}
              >
                <Icon className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-xs font-bold text-slate-900">{note.title}</p>
                  <button
                    type="button"
                    onClick={() => onDismiss(note.id)}
                    className="rounded p-0.5 text-slate-400 hover:bg-white/60 hover:text-slate-700"
                    aria-label="Dismiss notification"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-0.5 text-xs text-slate-700">{note.message}</p>

                {note.order && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {isKitchenView && note.order.status === 'Pending' && (
                      <button
                        type="button"
                        onClick={() => {
                          void onUpdateStatus(note.order!.id, 'Cooking');
                          onDismiss(note.id);
                        }}
                        className="rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-600"
                      >
                        Start Cooking
                      </button>
                    )}

                    {!isKitchenView && note.order.status === 'Ready' && (
                      <button
                        type="button"
                        onClick={() => {
                          void onUpdateStatus(note.order!.id, 'Completed');
                          onDismiss(note.id);
                        }}
                        className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                      >
                        Serve &amp; Complete
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onOpenReceipt(note.order!)}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Printer className="h-3 w-3" />
                      Bill / KOT
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
