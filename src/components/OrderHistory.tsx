import { useCallback, useEffect, useState } from 'react';
import { Download, Printer, RefreshCw, Search } from 'lucide-react';
import type { DailySummary, Order, OrderStatus } from '../types.ts';
import { formatDateTime, formatINR } from '../utils/format.ts';

interface OrderHistoryProps {
  summary: DailySummary;
  onOpenReceipt: (order: Order) => void;
  onUpdateOrderStatus: (orderId: number, newStatus: OrderStatus) => Promise<void>;
}

export function OrderHistory({
  summary,
  onOpenReceipt,
  onUpdateOrderStatus,
}: OrderHistoryProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [range, setRange] = useState<'today' | '7d' | 'all'>('today');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'All') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());
      params.set('range', range);

      const res = await fetch(`/api/orders?${params.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as Order[];
        setOrders(data);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, range]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadOrders();
    }, 150);
    return () => window.clearTimeout(t);
  }, [loadOrders]);

  const handleExportCSV = () => {
    const header = [
      'Order Code',
      'Token',
      'Date',
      'Order Type',
      'Table/Seat',
      'Customer',
      'Status',
      'Payment',
      'Subtotal',
      'Tax',
      'Discount',
      'Total',
      'Items',
    ];
    const rows = orders.map((o) => [
      o.order_code,
      String(o.token_number),
      formatDateTime(o.created_at),
      o.order_type,
      o.table_or_seat,
      o.customer_name,
      o.status,
      o.payment_method,
      String(o.subtotal),
      String(o.tax_amount),
      String(o.discount_amount),
      String(o.total_amount),
      o.items.map((i) => `${i.quantity}x ${i.item_name}`).join('; '),
    ]);

    const csv = [header, ...rows]
      .map((cols) => cols.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-maharaja-orders-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusClass = (status: OrderStatus) => {
    switch (status) {
      case 'Pending':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Cooking':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Ready':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Completed':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Cancelled':
        return 'bg-red-50 text-red-700 border-red-200';
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-5 px-4 py-5 sm:px-6">
      {/* Daily Sales KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Today&apos;s Revenue</div>
          <div className="font-mono-num mt-1.5 text-2xl font-bold text-slate-900">
            {formatINR(summary.today_revenue)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {summary.completed_orders} served · {summary.today_orders} total orders
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Average Order Value</div>
          <div className="font-mono-num mt-1.5 text-2xl font-bold text-slate-900">
            {formatINR(summary.avg_order_value)}
          </div>
          <div className="mt-1 text-xs text-slate-500">Per non-cancelled bill today</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Active Kitchen Queue</div>
          <div className="font-mono-num mt-1.5 text-2xl font-bold text-slate-900">
            {summary.active_queue}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {summary.pending_count} pending · {summary.cooking_count} cooking · {summary.ready_count} ready
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Top Item Today</div>
          <div className="mt-1.5 truncate text-lg font-bold text-slate-900">
            {summary.top_items[0]?.item_name || 'No orders yet'}
          </div>
          <div className="font-mono-num mt-1 text-xs text-slate-500">
            {summary.top_items[0]
              ? `${summary.top_items[0].total_qty} sold · ${formatINR(summary.top_items[0].total_sales)}`
              : 'Place an order to track top sellers'}
          </div>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1 max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search token, bill no., seat, customer, or dish..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pr-3 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {(
              [
                { id: 'today', label: 'Today' },
                { id: '7d', label: 'Last 7 Days' },
                { id: 'all', label: 'All Time' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setRange(opt.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  range === opt.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by order status"
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:border-slate-900 focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active Queue</option>
            <option value="Completed">Completed</option>
            <option value="Pending">Pending</option>
            <option value="Cooking">Cooking</option>
            <option value="Ready">Ready</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadOrders()}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            type="button"
            disabled={orders.length === 0}
            onClick={handleExportCSV}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                <th className="px-4 py-3">Bill &amp; Token</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Type / Seat</th>
                <th className="px-4 py-3">Items Ordered</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-xs text-slate-500">
                    Loading order records...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-xs text-slate-500">
                    No orders found for the selected period or search query.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-4 py-3 align-top">
                      <div className="font-mono-num font-bold text-slate-900">
                        #{order.token_number}
                      </div>
                      <div className="font-mono-num text-xs text-slate-500">
                        {order.order_code}
                      </div>
                    </td>
                    <td className="font-mono-num px-4 py-3 align-top text-xs text-slate-600 whitespace-nowrap">
                      {formatDateTime(order.created_at)}
                    </td>
                    <td className="px-4 py-3 align-top text-xs">
                      <div className="font-medium text-slate-900">{order.order_type}</div>
                      {(order.table_or_seat || order.customer_name) && (
                        <div className="text-slate-500">
                          {[order.table_or_seat, order.customer_name].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-slate-700 max-w-xs">
                      {order.items.map((item) => (
                        <div key={item.id} className="truncate">
                          <span className="font-mono-num font-semibold">{item.quantity}×</span>{' '}
                          {item.item_name}
                        </div>
                      ))}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${getStatusClass(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-slate-600">
                      {order.payment_method}
                    </td>
                    <td className="font-mono-num px-4 py-3 align-top text-right font-semibold text-slate-900 whitespace-nowrap">
                      {formatINR(order.total_amount)}
                    </td>
                    <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {order.status === 'Ready' && (
                          <button
                            type="button"
                            onClick={async () => {
                              await onUpdateOrderStatus(order.id, 'Completed');
                              void loadOrders();
                            }}
                            className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                          >
                            Complete
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onOpenReceipt(order)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          <Printer className="h-3 w-3" />
                          Bill
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
