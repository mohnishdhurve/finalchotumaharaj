import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, BellOff, BellRing, Plus, Smartphone } from 'lucide-react';
import { io, type Socket } from 'socket.io-client';
import { ChefConnectModal } from './components/ChefConnectModal.tsx';
import { CounterPOS } from './components/CounterPOS.tsx';
import { KitchenDisplay } from './components/KitchenDisplay.tsx';
import { MenuItemModal } from './components/MenuItemModal.tsx';
import { MenuManager } from './components/MenuManager.tsx';
import { NotificationCenter } from './components/NotificationCenter.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';
import { OrderHistory } from './components/OrderHistory.tsx';
import { PWAInstallButton } from './components/PWAInstallButton.tsx';
import { ReceiptModal } from './components/ReceiptModal.tsx';
import type {
  CreateOrderPayload,
  DailySummary,
  DeviceNotification,
  MenuItem,
  Order,
  OrderStatus,
  PresenceState,
} from './types.ts';
import {
  getNotificationPermission,
  requestNotificationPermission,
  showSystemNotification,
  type BrowserNotificationState,
} from './utils/notifications.ts';
import { playKitchenChime, unlockKitchenAudio, vibrateDevice } from './utils/sound.ts';

type ActiveView = 'pos' | 'kitchen' | 'history' | 'menu';

const EMPTY_SUMMARY: DailySummary = {
  today_revenue: 0,
  today_orders: 0,
  completed_orders: 0,
  active_queue: 0,
  pending_count: 0,
  cooking_count: 0,
  ready_count: 0,
  avg_order_value: 0,
  top_items: [],
};

function isKitchenQueryParam(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('role') === 'kitchen' || params.get('mode') === 'kitchen';
}

export default function App() {
  const [isChefMobileMode, setIsChefMobileMode] = useState<boolean>(() => isKitchenQueryParam());
  const [activeView, setActiveView] = useState<ActiveView>(() =>
    isKitchenQueryParam() ? 'kitchen' : 'pos'
  );
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<DailySummary>(EMPTY_SUMMARY);
  const [presence, setPresence] = useState<PresenceState>({ counterCount: 0, kitchenCount: 0 });
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const activeViewRef = useRef(activeView);
  activeViewRef.current = activeView;

  const [notifPermission, setNotifPermission] = useState<BrowserNotificationState>(() =>
    getNotificationPermission()
  );
  const [notifications, setNotifications] = useState<DeviceNotification[]>([]);
  const [chefConnectOpen, setChefConnectOpen] = useState(false);

  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const localCreatedOrderIdsRef = useRef<Set<number>>(new Set());
  const localUpdatedOrderKeysRef = useRef<Set<string>>(new Set());

  const pushNotification = useCallback(
    (note: Omit<DeviceNotification, 'id' | 'createdAt'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const entry: DeviceNotification = { ...note, id, createdAt: Date.now() };
      setNotifications((prev) => [entry, ...prev].slice(0, 4));
      window.setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 10000);
    },
    []
  );

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleEnablePushAlerts = useCallback(async () => {
    await unlockKitchenAudio();
    const permission = await requestNotificationPermission();
    setNotifPermission(permission);
    if (permission === 'granted') {
      playKitchenChime('status-update');
    }
  }, []);

  // Automatically unlock Web Audio API on first user interaction anywhere in the app
  useEffect(() => {
    const unlockOnGesture = () => {
      void unlockKitchenAudio();
    };
    window.addEventListener('pointerdown', unlockOnGesture, { once: true });
    window.addEventListener('keydown', unlockOnGesture, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockOnGesture);
      window.removeEventListener('keydown', unlockOnGesture);
    };
  }, []);

  const fetchInitialData = useCallback(async () => {
    setLoadError('');
    try {
      const [menuRes, activeRes, summaryRes] = await Promise.all([
        fetch('/api/menu'),
        fetch('/api/orders/active'),
        fetch('/api/summary'),
      ]);

      if (!menuRes.ok || !activeRes.ok || !summaryRes.ok) {
        throw new Error('Unable to connect to Chat Maharaja backend server.');
      }

      const [menuData, activeData, summaryData] = (await Promise.all([
        menuRes.json(),
        activeRes.json(),
        summaryRes.json(),
      ])) as [MenuItem[], Order[], DailySummary];

      setMenuItems(menuData);
      setActiveOrders(activeData);
      setSummary(summaryData);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchInitialData();

    const socket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join_role', activeViewRef.current === 'kitchen' ? 'kitchen' : 'counter');
      socket.emit('sync_active_orders');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('presence_updated', (nextPresence: PresenceState) => {
      setPresence(nextPresence);
    });

    socket.on('active_orders_snapshot', (orders: Order[]) => {
      setActiveOrders(orders);
    });

    socket.on('new_order_alert', (order: Order) => {
      setActiveOrders((prev) => {
        if (prev.some((o) => o.id === order.id)) return prev;
        return [...prev, order];
      });

      const placedLocally = localCreatedOrderIdsRef.current.has(order.id);
      if (placedLocally) {
        localCreatedOrderIdsRef.current.delete(order.id);
      }

      const itemCount = order.items.reduce((s, it) => s + it.quantity, 0);
      const locationLabel = order.table_or_seat
        ? `${order.order_type} · ${order.table_or_seat}`
        : order.order_type;

      // Alert Kitchen (Chef Mobile) loudly, or alert other Counter terminals
      if (activeViewRef.current === 'kitchen' || !placedLocally) {
        if (soundEnabledRef.current) {
          playKitchenChime('new-order');
        }
        vibrateDevice([220, 100, 220, 100, 320]);
        pushNotification({
          title: `New Order #${order.token_number}`,
          message: `${locationLabel} · ${itemCount} item${itemCount === 1 ? '' : 's'}`,
          tone: 'new-order',
          order,
        });
        void showSystemNotification(
          `New Kitchen Order #${order.token_number}`,
          `${locationLabel} — ${order.items.map((i) => `${i.quantity}x ${i.item_name}`).join(', ')}`,
          `order-new-${order.id}`
        );
      }
    });

    socket.on('order_status_synced', (updated: Order) => {
      setActiveOrders((prev) => {
        const isStillActive =
          updated.status === 'Pending' ||
          updated.status === 'Cooking' ||
          updated.status === 'Ready';

        if (!isStillActive) {
          return prev.filter((o) => o.id !== updated.id);
        }

        const exists = prev.some((o) => o.id === updated.id);
        if (!exists) {
          return [...prev, updated];
        }
        return prev.map((o) => (o.id === updated.id ? updated : o));
      });

      const localKey = `${updated.id}:${updated.status}`;
      const updatedLocally = localUpdatedOrderKeysRef.current.has(localKey);
      if (updatedLocally) {
        localUpdatedOrderKeysRef.current.delete(localKey);
      }

      // Two-way notifications: notify the OTHER side (Chef <-> Counter)
      if (!updatedLocally) {
        const locationLabel = updated.table_or_seat || updated.order_type;

        if (updated.status === 'Cooking' && activeViewRef.current !== 'kitchen') {
          if (soundEnabledRef.current) playKitchenChime('status-update');
          pushNotification({
            title: `Order #${updated.token_number} Cooking`,
            message: `Chef started preparing (${locationLabel})`,
            tone: 'cooking',
            order: updated,
          });
        } else if (updated.status === 'Ready') {
          if (soundEnabledRef.current) playKitchenChime('order-ready');
          vibrateDevice([180, 90, 250]);
          pushNotification({
            title: `Order #${updated.token_number} Ready!`,
            message: `${locationLabel} is ready for pickup & serving.`,
            tone: 'ready',
            order: updated,
          });
          void showSystemNotification(
            `Order #${updated.token_number} Ready!`,
            `${locationLabel} is ready for pickup at the counter.`,
            `order-ready-${updated.id}`
          );
        } else if (updated.status === 'Cancelled' && activeViewRef.current === 'kitchen') {
          if (soundEnabledRef.current) playKitchenChime('status-update');
          vibrateDevice([150, 80, 150]);
          pushNotification({
            title: `Order #${updated.token_number} Cancelled`,
            message: `Cancelled from Counter (${locationLabel})`,
            tone: 'cancelled',
          });
          void showSystemNotification(
            `Order #${updated.token_number} Cancelled`,
            `Counter cancelled order #${updated.token_number}.`,
            `order-cancel-${updated.id}`
          );
        } else if (updated.status === 'Completed' && activeViewRef.current === 'kitchen') {
          pushNotification({
            title: `Order #${updated.token_number} Served`,
            message: `Marked completed at Counter (${locationLabel})`,
            tone: 'completed',
          });
        }
      }
    });

    socket.on('menu_synced', (items: MenuItem[]) => {
      setMenuItems(items);
    });

    socket.on('summary_updated', (nextSummary: DailySummary) => {
      setSummary(nextSummary);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [fetchInitialData, pushNotification]);

  useEffect(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join_role', activeView === 'kitchen' ? 'kitchen' : 'counter');
    }
  }, [activeView]);

  const existingCategories = useMemo(
    () => Array.from(new Set(menuItems.map((m) => m.category))),
    [menuItems]
  );

  const handlePlaceOrder = async (payload: CreateOrderPayload): Promise<Order> => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(errBody.error || 'Failed to place order.');
    }
    const created = (await res.json()) as Order;
    localCreatedOrderIdsRef.current.add(created.id);
    setActiveOrders((prev) => {
      if (prev.some((o) => o.id === created.id)) return prev;
      return [...prev, created];
    });
    return created;
  };

  const handleUpdateOrderStatus = async (orderId: number, newStatus: OrderStatus) => {
    localUpdatedOrderKeysRef.current.add(`${orderId}:${newStatus}`);
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      localUpdatedOrderKeysRef.current.delete(`${orderId}:${newStatus}`);
      throw new Error('Failed to update order status.');
    }
    const updated = (await res.json()) as Order;
    setActiveOrders((prev) => {
      const stillActive =
        updated.status === 'Pending' ||
        updated.status === 'Cooking' ||
        updated.status === 'Ready';
      if (!stillActive) return prev.filter((o) => o.id !== updated.id);
      return prev.map((o) => (o.id === updated.id ? updated : o));
    });
  };

  const handleSaveMenuItem = async (data: {
    name: string;
    category: string;
    price: number;
    description: string;
    prep_time_mins: number;
    is_veg: boolean;
    is_available: boolean;
  }) => {
    if (editingMenuItem) {
      const res = await fetch(`/api/menu/${editingMenuItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update menu item.');
    } else {
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to add menu item.');
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    const res = await fetch(`/api/menu/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_available: !item.is_available }),
    });
    if (!res.ok) throw new Error('Failed to update availability.');
  };

  const handleDeleteMenuItem = async (item: MenuItem) => {
    const res = await fetch(`/api/menu/${item.id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete item.');
  };

  const switchRoleMode = (kitchenOnly: boolean) => {
    setIsChefMobileMode(kitchenOnly);
    setActiveView(kitchenOnly ? 'kitchen' : 'pos');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (kitchenOnly) {
        url.searchParams.set('role', 'kitchen');
      } else {
        url.searchParams.delete('role');
        url.searchParams.delete('mode');
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

  const kitchenCount = activeOrders.length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Strict 3-Zone Top Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6">
          {/* Zone 1: Single-line Wordmark */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setActiveView(isChefMobileMode ? 'kitchen' : 'pos')}
              className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
            >
              Chat Maharaja
            </button>
            {isChefMobileMode && (
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 whitespace-nowrap">
                Chef Mobile
              </span>
            )}
          </div>

          {/* Zone 2: Clean Text Nav Links (hidden in focused Chef Mobile Mode) */}
          {!isChefMobileMode && (
            <nav
              className="hidden md:flex items-center gap-6 text-sm font-medium"
              aria-label="Primary sections"
            >
              {(
                [
                  { id: 'pos', label: 'Counter POS' },
                  {
                    id: 'kitchen',
                    label: kitchenCount > 0 ? `Kitchen Display (${kitchenCount})` : 'Kitchen Display',
                  },
                  { id: 'history', label: 'Order History' },
                  { id: 'menu', label: 'Menu Manager' },
                ] as Array<{ id: ActiveView; label: string }>
              ).map((nav) => {
                const isActive = activeView === nav.id;
                return (
                  <button
                    key={nav.id}
                    type="button"
                    onClick={() => setActiveView(nav.id)}
                    className={`relative py-5 transition-colors whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'font-semibold text-slate-900'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {nav.label}
                    {isActive && (
                      <span className="absolute right-0 bottom-0 left-0 h-0.5 bg-amber-600" />
                    )}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Zone 3: Device Sync, Alerts, Install App & Primary Action */}
          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton compact />

            {notifPermission !== 'unsupported' && notifPermission !== 'granted' && (
              <button
                type="button"
                onClick={() => void handleEnablePushAlerts()}
                className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100 whitespace-nowrap shrink-0"
                title="Enable browser / mobile push notifications"
              >
                <BellRing className="h-3.5 w-3.5" />
                Enable Alerts
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                void unlockKitchenAudio();
                setSoundEnabled((prev) => !prev);
              }}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors shrink-0 ${
                soundEnabled
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
              }`}
              title={soundEnabled ? 'Sound notifications enabled' : 'Sound muted'}
              aria-label={soundEnabled ? 'Mute notification chimes' : 'Enable notification chimes'}
            >
              {soundEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </button>

            {isChefMobileMode ? (
              <button
                type="button"
                onClick={() => switchRoleMode(false)}
                className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                Full POS
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setChefConnectOpen(true)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
                >
                  <Smartphone className="h-3.5 w-3.5 text-amber-600" />
                  <span className="hidden sm:inline">Chef Mobile</span>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      presence.kitchenCount > 0 ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                    title={
                      presence.kitchenCount > 0
                        ? `${presence.kitchenCount} chef device(s) connected`
                        : 'No chef mobile connected yet'
                    }
                  />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingMenuItem(null);
                    setMenuModalOpen(true);
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-amber-600 whitespace-nowrap shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Item</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile Nav Strip (in standard mode) */}
        {!isChefMobileMode && (
          <div className="flex items-center gap-1 overflow-x-auto border-t border-slate-100 px-4 py-1.5 md:hidden">
            {(
              [
                { id: 'pos', label: 'Counter POS' },
                {
                  id: 'kitchen',
                  label: kitchenCount > 0 ? `Kitchen (${kitchenCount})` : 'Kitchen',
                },
                { id: 'history', label: 'History' },
                { id: 'menu', label: 'Menu' },
              ] as Array<{ id: ActiveView; label: string }>
            ).map((nav) => (
              <button
                key={nav.id}
                type="button"
                onClick={() => setActiveView(nav.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
                  activeView === nav.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {nav.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Live Two-Way Notification Stack */}
      <NotificationCenter
        notifications={notifications}
        isKitchenView={activeView === 'kitchen'}
        onDismiss={dismissNotification}
        onOpenReceipt={(order) => setReceiptOrder(order)}
        onUpdateStatus={handleUpdateOrderStatus}
      />

      {/* Main Content */}
      <main>
        {loading ? (
          <div className="mx-auto max-w-[1440px] px-4 py-16 text-center text-sm text-slate-500 sm:px-6">
            Loading Chat Maharaja POS &amp; Kitchen System...
          </div>
        ) : loadError ? (
          <div className="mx-auto max-w-lg px-4 py-16 text-center">
            <div className="rounded-xl border border-red-200 bg-white p-6">
              <p className="text-sm font-semibold text-red-700">{loadError}</p>
              <button
                type="button"
                onClick={() => void fetchInitialData()}
                className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Retry Connection
              </button>
            </div>
          </div>
        ) : activeView === 'pos' ? (
          <CounterPOS
            menuItems={menuItems}
            activeOrders={activeOrders}
            onPlaceOrder={handlePlaceOrder}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onOpenReceipt={(order) => setReceiptOrder(order)}
            onOpenAddMenuItem={() => {
              setEditingMenuItem(null);
              setMenuModalOpen(true);
            }}
          />
        ) : activeView === 'kitchen' ? (
          <KitchenDisplay
            activeOrders={activeOrders}
            isConnected={isConnected}
            soundEnabled={soundEnabled}
            presence={presence}
            notifPermission={notifPermission}
            onRequestNotifications={handleEnablePushAlerts}
            onToggleSound={setSoundEnabled}
            onUpdateStatus={handleUpdateOrderStatus}
            onOpenReceipt={(order) => setReceiptOrder(order)}
          />
        ) : activeView === 'history' ? (
          <OrderHistory
            summary={summary}
            onOpenReceipt={(order) => setReceiptOrder(order)}
            onUpdateOrderStatus={handleUpdateOrderStatus}
          />
        ) : (
          <MenuManager
            menuItems={menuItems}
            onAddNew={() => {
              setEditingMenuItem(null);
              setMenuModalOpen(true);
            }}
            onEditItem={(item) => {
              setEditingMenuItem(item);
              setMenuModalOpen(true);
            }}
            onToggleAvailability={handleToggleAvailability}
            onDeleteItem={handleDeleteMenuItem}
          />
        )}
      </main>

      {/* Thermal Receipt / Bill Modal */}
      <ReceiptModal order={receiptOrder} onClose={() => setReceiptOrder(null)} />

      {/* Add / Edit Menu Item Modal */}
      <MenuItemModal
        isOpen={menuModalOpen}
        editingItem={editingMenuItem}
        existingCategories={existingCategories}
        onClose={() => {
          setMenuModalOpen(false);
          setEditingMenuItem(null);
        }}
        onSave={handleSaveMenuItem}
      />

      {/* Chef Mobile QR & PWA App Setup Modal */}
      <ChefConnectModal
        isOpen={chefConnectOpen}
        presence={presence}
        onClose={() => setChefConnectOpen(false)}
        onOpenKitchenHere={() => switchRoleMode(true)}
      />

      {/* Offline PWA Indicator */}
      <OfflineIndicator />
    </div>
  );
}
