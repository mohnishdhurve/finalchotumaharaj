import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  MessageSquarePlus,
  Minus,
  Plus,
  Printer,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import type {
  CartItem,
  CreateOrderPayload,
  MenuItem,
  Order,
  OrderStatus,
  OrderType,
  PaymentMethod,
} from '../types.ts';
import { formatINR, formatTime } from '../utils/format.ts';

interface CounterPOSProps {
  menuItems: MenuItem[];
  activeOrders: Order[];
  onPlaceOrder: (payload: CreateOrderPayload) => Promise<Order>;
  onUpdateOrderStatus: (orderId: number, status: OrderStatus) => Promise<void>;
  onOpenReceipt: (order: Order) => void;
  onOpenAddMenuItem: () => void;
}

const QUICK_NOTES = ['Extra Spicy', 'Less Sugar', 'No Onion', 'Extra Cheese', 'Hot'];

export function CounterPOS({
  menuItems,
  activeOrders,
  onPlaceOrder,
  onUpdateOrderStatus,
  onOpenReceipt,
  onOpenAddMenuItem,
}: CounterPOSProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [editingNoteItemId, setEditingNoteItemId] = useState<number | null>(null);

  const [orderType, setOrderType] = useState<OrderType>('Dine-In');
  const [tableOrSeat, setTableOrSeat] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [gstRate, setGstRate] = useState<number>(5);
  const [discount, setDiscount] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const categories = useMemo(() => {
    const unique = Array.from(new Set(menuItems.map((m) => m.category)));
    return ['All', ...unique];
  }, [menuItems]);

  const filteredMenu = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menuItems.filter((item) => {
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    });
  }, [menuItems, selectedCategory, search]);

  const readyOrders = useMemo(
    () => activeOrders.filter((o) => o.status === 'Ready'),
    [activeOrders]
  );

  const cartQtyById = useMemo(() => {
    const map = new Map<number, number>();
    for (const c of cart) {
      map.set(c.menuItem.id, c.quantity);
    }
    return map;
  }, [cart]);

  const addToCart = (item: MenuItem) => {
    if (!item.is_available) return;
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { menuItem: item, quantity: 1, notes: '' }];
    });
  };

  const updateCartQty = (itemId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.menuItem.id === itemId ? { ...c, quantity: c.quantity + delta } : c
        )
        .filter((c) => c.quantity > 0)
    );
  };

  const updateCartNote = (itemId: number, notes: string) => {
    setCart((prev) =>
      prev.map((c) => (c.menuItem.id === itemId ? { ...c, notes } : c))
    );
  };

  const appendQuickNote = (itemId: number, tag: string) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.menuItem.id !== itemId) return c;
        const current = c.notes.trim();
        if (!current) return { ...c, notes: tag };
        if (current.toLowerCase().includes(tag.toLowerCase())) return c;
        return { ...c, notes: `${current}, ${tag}` };
      })
    );
  };

  const clearCart = () => {
    setCart([]);
    setEditingNoteItemId(null);
    setTableOrSeat('');
    setCustomerName('');
    setCustomerPhone('');
    setDiscount('');
    setSubmitError('');
  };

  const subtotal = useMemo(
    () => cart.reduce((sum, c) => sum + c.menuItem.price * c.quantity, 0),
    [cart]
  );

  const discountVal = Math.max(0, Math.min(subtotal, Number(discount) || 0));
  const taxableAmount = Math.max(0, subtotal - discountVal);
  const taxAmount = Math.round(taxableAmount * (gstRate / 100) * 100) / 100;
  const grandTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const payload: CreateOrderPayload = {
        order_type: orderType,
        table_or_seat: tableOrSeat.trim(),
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        payment_method: paymentMethod,
        gst_rate: gstRate,
        discount_amount: discountVal,
        items: cart.map((c) => ({
          item_id: c.menuItem.id,
          item_name: c.menuItem.name,
          category: c.menuItem.category,
          quantity: c.quantity,
          unit_price: c.menuItem.price,
          notes: c.notes.trim(),
        })),
      };
      const created = await onPlaceOrder(payload);
      clearCart();
      onOpenReceipt(created);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not place order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6">
      {/* Live Ready for Pickup Banner (Only shown when Kitchen marks orders Ready) */}
      {readyOrders.length > 0 && (
        <section
          aria-label="Orders ready for pickup"
          className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Ready for Counter Pickup ({readyOrders.length})</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {readyOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs"
                >
                  <span className="font-mono-num font-bold text-slate-900">
                    #{order.token_number}
                  </span>
                  <span className="text-slate-500">
                    {order.table_or_seat || order.order_type}
                  </span>
                  <span className="text-slate-300" aria-hidden="true">·</span>
                  <span className="font-mono-num text-slate-600">{formatTime(order.created_at)}</span>
                  <button
                    type="button"
                    onClick={() => onOpenReceipt(order)}
                    className="ml-1 rounded px-2 py-1 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 whitespace-nowrap"
                    title="View or Print Bill"
                  >
                    Bill
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateOrderStatus(order.id, 'Completed')}
                    className="rounded bg-emerald-600 px-2.5 py-1 font-semibold text-white transition-colors hover:bg-emerald-700 whitespace-nowrap"
                  >
                    Serve
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* Left/Center Catalog Workspace */}
        <div className="space-y-4 lg:col-span-8">
          {/* Search & Category Controls */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search menu items, combos, or snacks..."
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pr-9 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={onOpenAddMenuItem}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap shrink-0"
              >
                <Plus className="h-4 w-4" />
                Quick Add Dish
              </button>
            </div>

            {/* Category Filter Tabs */}
            <div
              className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1"
              role="tablist"
              aria-label="Menu categories"
            >
              {categories.map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Menu Grid */}
          {filteredMenu.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center">
              <p className="text-sm font-medium text-slate-900">No dishes match your filter</p>
              <p className="mt-1 text-xs text-slate-500">
                Try clearing your search or add a new item directly to the Chat Maharaja menu.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('All');
                }}
                className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredMenu.map((item) => {
                const qty = cartQtyById.get(item.id) || 0;
                return (
                  <div
                    key={item.id}
                    className={`flex flex-col justify-between rounded-xl border bg-white p-4 transition-colors ${
                      qty > 0
                        ? 'border-amber-500 ring-1 ring-amber-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    } ${!item.is_available ? 'opacity-60' : ''}`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                        <span className="truncate">{item.category}</span>
                        <span
                          className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[2px] border ${
                            item.is_veg ? 'border-emerald-600' : 'border-red-600'
                          }`}
                          title={item.is_veg ? 'Veg' : 'Non-Veg'}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              item.is_veg ? 'bg-emerald-600' : 'bg-red-600'
                            }`}
                          />
                        </span>
                      </div>

                      <h3 className="mt-1.5 text-[15px] font-semibold leading-snug text-slate-900">
                        {item.name}
                      </h3>

                      {item.description && (
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                      <span className="font-mono-num text-base font-bold text-slate-900">
                        {formatINR(item.price)}
                      </span>

                      {!item.is_available ? (
                        <span className="text-xs font-medium text-slate-400">Out of stock</span>
                      ) : qty === 0 ? (
                        <button
                          type="button"
                          onClick={() => addToCart(item)}
                          className="inline-flex h-9 items-center gap-1 rounded-lg bg-slate-900 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-amber-600 whitespace-nowrap shrink-0"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.id, -1)}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-700 hover:bg-white hover:text-slate-900"
                            aria-label={`Decrease quantity of ${item.name}`}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="font-mono-num min-w-[24px] text-center text-sm font-bold text-slate-900">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.id, 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-700 hover:bg-white hover:text-slate-900"
                            aria-label={`Increase quantity of ${item.name}`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Sticky Order & Billing Panel */}
        <aside className="lg:sticky lg:top-20 lg:col-span-4">
          <div className="rounded-xl border border-slate-200 bg-white">
            {/* Cart Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-slate-700" />
                <h2 className="font-display text-base font-bold text-slate-900">
                  Current Order
                </h2>
                {cart.length > 0 && (
                  <span className="font-mono-num text-xs text-slate-500">
                    ({cart.reduce((s, c) => s + c.quantity, 0)} items)
                  </span>
                )}
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs font-medium text-slate-500 hover:text-red-600"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Order Metadata: Type & Table/Seat */}
            <div className="space-y-3 border-b border-slate-100 px-5 py-4">
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
                {(['Dine-In', 'Takeaway', 'Cinema Seat'] as OrderType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setOrderType(type)}
                    className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                      orderType === type
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="text"
                  value={tableOrSeat}
                  onChange={(e) => setTableOrSeat(e.target.value)}
                  placeholder={
                    orderType === 'Cinema Seat'
                      ? 'Seat (e.g. Audi 1 F12)'
                      : orderType === 'Dine-In'
                      ? 'Table No. (e.g. T-04)'
                      : 'Counter / Token'
                  }
                  className="h-10 rounded-lg border border-slate-200 px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
                />
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer Name"
                  className="h-10 rounded-lg border border-slate-200 px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
                />
              </div>

              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Phone Number (optional)"
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
              />
            </div>

            {/* Cart Line Items */}
            <div className="max-h-[300px] divide-y divide-slate-100 overflow-y-auto px-5">
              {cart.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm font-medium text-slate-500">Order cart is empty</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Tap dishes on the left to start billing and send to kitchen.
                  </p>
                </div>
              ) : (
                cart.map((c) => {
                  const isEditingNote = editingNoteItemId === c.menuItem.id;
                  return (
                    <div key={c.menuItem.id} className="py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-slate-900">
                            {c.menuItem.name}
                          </div>
                          <div className="font-mono-num text-xs text-slate-500">
                            {formatINR(c.menuItem.price)} each
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center rounded-md border border-slate-200">
                            <button
                              type="button"
                              onClick={() => updateCartQty(c.menuItem.id, -1)}
                              className="flex h-7 w-7 items-center justify-center text-slate-600 hover:bg-slate-50"
                              aria-label="Decrease"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="font-mono-num min-w-[20px] text-center text-xs font-semibold text-slate-900">
                              {c.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateCartQty(c.menuItem.id, 1)}
                              className="flex h-7 w-7 items-center justify-center text-slate-600 hover:bg-slate-50"
                              aria-label="Increase"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          <span className="font-mono-num min-w-[54px] text-right text-sm font-semibold text-slate-900">
                            {formatINR(c.menuItem.price * c.quantity)}
                          </span>

                          <button
                            type="button"
                            onClick={() => updateCartQty(c.menuItem.id, -c.quantity)}
                            className="p-1 text-slate-400 hover:text-red-600"
                            aria-label={`Remove ${c.menuItem.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingNoteItemId(isEditingNote ? null : c.menuItem.id)
                          }
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-900"
                        >
                          <MessageSquarePlus className="h-3 w-3" />
                          {c.notes ? `Note: ${c.notes}` : 'Add kitchen note'}
                        </button>
                      </div>

                      {isEditingNote && (
                        <div className="mt-2 space-y-1.5">
                          <input
                            type="text"
                            value={c.notes}
                            onChange={(e) => updateCartNote(c.menuItem.id, e.target.value)}
                            placeholder="Cooking instruction for chef..."
                            className="h-8 w-full rounded-md border border-slate-200 px-2.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                          />
                          <div className="flex flex-wrap gap-1">
                            {QUICK_NOTES.map((tag) => (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => appendQuickNote(c.menuItem.id, tag)}
                                className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                              >
                                + {tag}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Payment, GST & Bill Summary */}
            <div className="space-y-3 border-t border-slate-200 bg-slate-50/70 px-5 py-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-600">Payment</span>
                <div className="flex items-center gap-1 rounded-md bg-slate-200/70 p-0.5">
                  {(['Cash', 'UPI', 'Card'] as PaymentMethod[]).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                        paymentMethod === method
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-600">GST %</span>
                <div className="flex items-center gap-1 rounded-md bg-slate-200/70 p-0.5">
                  {[0, 5, 12].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setGstRate(rate)}
                      className={`font-mono-num rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                        gstRate === rate
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <label htmlFor="pos-discount" className="text-xs font-medium text-slate-600">
                  Discount (₹)
                </label>
                <input
                  id="pos-discount"
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0"
                  className="font-mono-num h-8 w-24 rounded-md border border-slate-200 bg-white px-2.5 text-right text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5 border-t border-slate-200 pt-3 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-mono-num font-medium text-slate-900">
                    {formatINR(subtotal)}
                  </span>
                </div>
                {discountVal > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount</span>
                    <span className="font-mono-num">-{formatINR(discountVal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>GST ({gstRate}%)</span>
                  <span className="font-mono-num font-medium text-slate-900">
                    {formatINR(taxAmount)}
                  </span>
                </div>
                <div className="flex justify-between pt-1 text-base font-bold text-slate-900">
                  <span>Grand Total</span>
                  <span className="font-mono-num">{formatINR(grandTotal)}</span>
                </div>
              </div>

              {submitError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {submitError}
                </div>
              )}

              <button
                type="button"
                disabled={cart.length === 0 || submitting}
                onClick={handleCheckout}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                <Printer className="h-4 w-4" />
                {submitting ? 'Sending to Kitchen...' : 'Place Order & Generate Bill'}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
