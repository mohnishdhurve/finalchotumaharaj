import { Printer, X } from 'lucide-react';
import type { Order } from '../types.ts';
import { formatDateTime, formatINR } from '../utils/format.ts';

interface ReceiptModalProps {
  order: Order | null;
  onClose: () => void;
}

export function ReceiptModal({ order, onClose }: ReceiptModalProps) {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label={`Bill receipt for token ${order.token_number}`}
    >
      <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Tax Invoice &amp; Kitchen Token
            </h2>
            <p className="text-xs text-slate-500">
              {order.order_code} · Token #{order.token_number}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-slate-900"
            aria-label="Close receipt modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable 80mm Thermal Receipt Preview */}
        <div className="overflow-y-auto bg-slate-50 p-5">
          <div
            id="thermal-receipt-print-area"
            className="mx-auto w-full max-w-[300px] border border-slate-200 bg-white p-5 text-slate-900 shadow-xs"
          >
            <div className="border-b border-dashed border-slate-300 pb-3 text-center">
              <div className="font-display text-lg font-bold tracking-tight text-slate-900">
                CHAT MAHARAJA
              </div>
              <div className="mt-0.5 text-[11px] font-medium text-slate-600">
                Chhotu Maharaj Cinema &amp; Cafe
              </div>
              <div className="text-[11px] text-slate-500">
                Sonoli Road, Multai, Distt. Betul (M.P.)
              </div>
            </div>

            <div className="border-b border-dashed border-slate-300 py-3 text-center">
              <div className="text-[11px] font-medium text-slate-500">TOKEN NUMBER</div>
              <div className="font-mono-num text-3xl font-bold text-slate-900">
                #{order.token_number}
              </div>
              <div className="mt-1 text-xs font-medium text-slate-700">
                {order.order_type}
                {order.table_or_seat ? ` · ${order.table_or_seat}` : ''}
              </div>
            </div>

            <div className="space-y-1 border-b border-dashed border-slate-300 py-2.5 text-[11px] text-slate-600">
              <div className="flex justify-between">
                <span>Bill No:</span>
                <span className="font-mono-num font-medium text-slate-900">{order.order_code}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span className="font-mono-num text-slate-900">{formatDateTime(order.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment:</span>
                <span className="font-medium text-slate-900">{order.payment_method}</span>
              </div>
              {order.customer_name && (
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="font-medium text-slate-900">
                    {order.customer_name}
                    {order.customer_phone ? ` (${order.customer_phone})` : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Line Items */}
            <div className="border-b border-dashed border-slate-300 py-2.5">
              <div className="mb-1.5 grid grid-cols-12 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                <span className="col-span-6">Item</span>
                <span className="col-span-2 text-center">Qty</span>
                <span className="col-span-4 text-right">Amt</span>
              </div>
              <div className="space-y-1.5">
                {order.items.map((item) => (
                  <div key={item.id} className="text-xs">
                    <div className="grid grid-cols-12 items-baseline">
                      <span className="col-span-6 font-medium text-slate-900">
                        {item.item_name}
                      </span>
                      <span className="col-span-2 text-center font-mono-num text-slate-700">
                        {item.quantity}
                      </span>
                      <span className="col-span-4 text-right font-mono-num font-medium text-slate-900">
                        {formatINR(item.quantity * item.unit_price)}
                      </span>
                    </div>
                    {item.notes && (
                      <div className="text-[10px] italic text-slate-500">
                        Note: {item.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-1 border-b border-dashed border-slate-300 py-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono-num">{formatINR(order.subtotal)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount</span>
                  <span className="font-mono-num">-{formatINR(order.discount_amount)}</span>
                </div>
              )}
              {order.tax_amount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>GST ({order.gst_rate}%)</span>
                  <span className="font-mono-num">{formatINR(order.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 text-sm font-bold text-slate-900">
                <span>Grand Total</span>
                <span className="font-mono-num">{formatINR(order.total_amount)}</span>
              </div>
            </div>

            <div className="pt-3 text-center text-[11px] text-slate-500">
              <p>Minimum prep time: 10–15 mins</p>
              <p className="mt-0.5 font-medium text-slate-700">Thank you for visiting Chat Maharaja!</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <Printer className="h-4 w-4" />
            Print 80mm Bill
          </button>
        </div>
      </div>
    </div>
  );
}
