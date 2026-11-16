import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  BellOff,
  BellRing,
  CheckCircle2,
  Clock,
  Flame,
  Monitor,
  Printer,
  Volume2,
  XCircle,
} from 'lucide-react';
import type { Order, OrderStatus, PresenceState } from '../types.ts';
import { formatElapsedMMSS, formatTime, getElapsedSeconds } from '../utils/format.ts';
import type { BrowserNotificationState } from '../utils/notifications.ts';
import { playKitchenChime, unlockKitchenAudio } from '../utils/sound.ts';

interface KitchenDisplayProps {
  activeOrders: Order[];
  isConnected: boolean;
  soundEnabled: boolean;
  presence?: PresenceState;
  notifPermission?: BrowserNotificationState;
  onRequestNotifications?: () => Promise<void>;
  onToggleSound: (enabled: boolean) => void;
  onUpdateStatus: (orderId: number, newStatus: OrderStatus) => Promise<void>;
  onOpenReceipt: (order: Order) => void;
}

type StageFilter = 'All' | 'Pending' | 'Cooking' | 'Ready';

export function KitchenDisplay({
  activeOrders,
  isConnected,
  soundEnabled,
  presence,
  notifPermission = 'unsupported',
  onRequestNotifications,
  onToggleSound,
  onUpdateStatus,
  onOpenReceipt,
}: KitchenDisplayProps) {
  const [stageFilter, setStageFilter] = useState<StageFilter>('All');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const handleEnableSound = async () => {
    if (soundEnabled) {
      onToggleSound(false);
      return;
    }
    const unlocked = await unlockKitchenAudio();
    onToggleSound(true);
    if (unlocked) {
      playKitchenChime('new-order');
    }
  };

  const handleToggleWakeLock = async () => {
    try {
      const nav = navigator as Navigator & {
        wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
      };
      if (!nav.wakeLock) return;
      if (!wakeLockActive) {
        await nav.wakeLock.request('screen');
        setWakeLockActive(true);
      } else {
        setWakeLockActive(false);
      }
    } catch {
      setWakeLockActive(false);
    }
  };

  const pendingOrders = useMemo(
    () => activeOrders.filter((o) => o.status === 'Pending'),
    [activeOrders]
  );
  const cookingOrders = useMemo(
    () => activeOrders.filter((o) => o.status === 'Cooking'),
    [activeOrders]
  );
  const readyOrders = useMemo(
    () => activeOrders.filter((o) => o.status === 'Ready'),
    [activeOrders]
  );

  const handleStageAction = async (orderId: number, nextStatus: OrderStatus) => {
    setBusyOrderId(orderId);
    try {
      await onUpdateStatus(orderId, nextStatus);
    } finally {
      setBusyOrderId(null);
    }
  };

  const renderOrderCard = (order: Order) => {
    const elapsedSecs = getElapsedSeconds(order.created_at, nowMs);
    const isWarning = elapsedSecs >= 600 && elapsedSecs < 900; // >= 10 mins
    const isOverdue = elapsedSecs >= 900; // >= 15 mins

    const statusBadge =
      order.status === 'Pending'
        ? {
            label: 'Pending',
            icon: Clock,
            classes: 'bg-amber-50 text-amber-800 border-amber-200',
            actionLabel: 'Start Cooking',
            nextStatus: 'Cooking' as OrderStatus,
            btnClass: 'bg-slate-900 hover:bg-amber-600 text-white',
          }
        : order.status === 'Cooking'
        ? {
            label: 'Cooking',
            icon: Flame,
            classes: 'bg-blue-50 text-blue-800 border-blue-200',
            actionLabel: 'Mark Ready',
            nextStatus: 'Ready' as OrderStatus,
            btnClass: 'bg-blue-600 hover:bg-blue-700 text-white',
          }
        : {
            label: 'Ready',
            icon: CheckCircle2,
            classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
            actionLabel: 'Serve & Complete',
            nextStatus: 'Completed' as OrderStatus,
            btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
          };

    const StatusIcon = statusBadge.icon;

    return (
      <article
        key={order.id}
        className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4"
      >
        <div>
          {/* Ticket Header */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono-num text-xl font-bold text-slate-900">
                  #{order.token_number}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${statusBadge.classes}`}
                >
                  <StatusIcon className="h-3 w-3" />
                  {statusBadge.label}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                <span className="font-medium text-slate-700">{order.order_type}</span>
                {order.table_or_seat && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-slate-800">{order.table_or_seat}</span>
                  </>
                )}
                {order.customer_name && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{order.customer_name}</span>
                  </>
                )}
              </div>
            </div>

            <div className="text-right">
              <div
                className={`font-mono-num text-sm font-bold ${
                  isOverdue
                    ? 'text-red-600'
                    : isWarning
                    ? 'text-amber-600'
                    : 'text-slate-700'
                }`}
                title="Elapsed time since order placed"
              >
                {formatElapsedMMSS(elapsedSecs)}
              </div>
              <div className="font-mono-num text-[11px] text-slate-400">
                {formatTime(order.created_at)}
              </div>
            </div>
          </div>

          {/* Items List */}
          <ul className="divide-y divide-slate-100 py-2">
            {order.items.map((item) => (
              <li key={item.id} className="py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-2.5">
                    <span className="font-mono-num inline-flex min-w-[26px] justify-center rounded bg-slate-100 px-1.5 py-0.5 text-sm font-bold text-slate-900">
                      {item.quantity}×
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {item.item_name}
                    </span>
                  </div>
                </div>
                {item.notes && (
                  <p className="mt-1 pl-9 text-xs font-medium text-amber-700">
                    Note: {item.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Ticket Actions */}
        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            disabled={busyOrderId === order.id}
            onClick={() => handleStageAction(order.id, statusBadge.nextStatus)}
            className={`h-10 flex-1 rounded-lg px-3 text-xs font-semibold transition-colors disabled:opacity-50 whitespace-nowrap ${statusBadge.btnClass}`}
          >
            {busyOrderId === order.id ? 'Updating...' : statusBadge.actionLabel}
          </button>

          <button
            type="button"
            onClick={() => onOpenReceipt(order)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 shrink-0"
            title="Print KOT / Bill"
            aria-label="Print bill"
          >
            <Printer className="h-4 w-4" />
          </button>

          {order.status === 'Pending' && (
            <button
              type="button"
              disabled={busyOrderId === order.id}
              onClick={() => handleStageAction(order.id, 'Cancelled')}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 shrink-0"
              title="Cancel order"
              aria-label="Cancel order"
            >
              <XCircle className="h-4 w-4" />
            </button>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6">
      {/* KDS Operational Toolbar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              aria-hidden="true"
            />
            <span>{isConnected ? 'Live Kitchen Sync' : 'Reconnecting...'}</span>
          </div>

          {presence && (
            <>
              <span className="text-slate-300" aria-hidden="true">|</span>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <span
                  className={`h-2 w-2 rounded-full ${
                    presence.counterCount > 0 ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                />
                <span>
                  {presence.counterCount > 0
                    ? `Counter Online (${presence.counterCount})`
                    : 'Counter Offline'}
                </span>
              </div>
            </>
          )}

          <span className="hidden sm:inline text-slate-300" aria-hidden="true">|</span>

          <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
            {(
              [
                { id: 'All', label: `All Active (${activeOrders.length})` },
                { id: 'Pending', label: `Pending (${pendingOrders.length})` },
                { id: 'Cooking', label: `Cooking (${cookingOrders.length})` },
                { id: 'Ready', label: `Ready (${readyOrders.length})` },
              ] as Array<{ id: StageFilter; label: string }>
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStageFilter(tab.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  stageFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {notifPermission !== 'unsupported' && notifPermission !== 'granted' && onRequestNotifications && (
            <button
              type="button"
              onClick={() => void onRequestNotifications()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100 whitespace-nowrap shrink-0"
            >
              <BellRing className="h-3.5 w-3.5" />
              Enable Mobile Alerts
            </button>
          )}

          <button
            type="button"
            onClick={handleEnableSound}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              soundEnabled
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {soundEnabled ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
            {soundEnabled ? 'Sound On' : 'Enable Sound'}
          </button>

          {soundEnabled && (
            <button
              type="button"
              onClick={() => playKitchenChime('new-order')}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap shrink-0"
              title="Test kitchen bell"
            >
              <Volume2 className="h-3.5 w-3.5" />
              Test Bell
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleWakeLock}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              wakeLockActive
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Monitor className="h-3.5 w-3.5" />
            {wakeLockActive ? 'Screen Awake' : 'Keep Awake'}
          </button>
        </div>
      </div>

      {/* Empty Queue State */}
      {activeOrders.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-20 text-center">
          <ChefEmptyState />
        </div>
      ) : stageFilter === 'All' ? (
        /* 3-Column Stage Board: Pending | Cooking | Ready */
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:items-start">
          {/* Pending Column */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <h2 className="font-display text-sm font-bold text-slate-900">Pending</h2>
              </div>
              <span className="font-mono-num text-xs font-semibold text-slate-500">
                {pendingOrders.length}
              </span>
            </div>
            {pendingOrders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 py-10 text-center text-xs text-slate-400">
                No pending orders
              </div>
            ) : (
              pendingOrders.map(renderOrderCard)
            )}
          </section>

          {/* Cooking Column */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-blue-600" />
                <h2 className="font-display text-sm font-bold text-slate-900">Cooking</h2>
              </div>
              <span className="font-mono-num text-xs font-semibold text-slate-500">
                {cookingOrders.length}
              </span>
            </div>
            {cookingOrders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 py-10 text-center text-xs text-slate-400">
                Nothing on the stove right now
              </div>
            ) : (
              cookingOrders.map(renderOrderCard)
            )}
          </section>

          {/* Ready Column */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <h2 className="font-display text-sm font-bold text-slate-900">Ready to Serve</h2>
              </div>
              <span className="font-mono-num text-xs font-semibold text-slate-500">
                {readyOrders.length}
              </span>
            </div>
            {readyOrders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 py-10 text-center text-xs text-slate-400">
                No orders waiting for pickup
              </div>
            ) : (
              readyOrders.map(renderOrderCard)
            )}
          </section>
        </div>
      ) : (
        /* Filtered Single Stage Grid */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(stageFilter === 'Pending'
            ? pendingOrders
            : stageFilter === 'Cooking'
            ? cookingOrders
            : readyOrders
          ).map(renderOrderCard)}
        </div>
      )}
    </div>
  );
}

function ChefEmptyState() {
  return (
    <div className="mx-auto max-w-sm">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        <Flame className="h-6 w-6" />
      </div>
      <h3 className="font-display text-base font-bold text-slate-900">
        Kitchen queue is clear
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        New orders placed from the Counter POS appear here immediately with live timers and audio chime alerts.
      </p>
    </div>
  );
}
