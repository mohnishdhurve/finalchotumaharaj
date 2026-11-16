export type OrderStatus = 'Pending' | 'Cooking' | 'Ready' | 'Completed' | 'Cancelled';

export type OrderType = 'Dine-In' | 'Takeaway' | 'Cinema Seat';

export type PaymentMethod = 'Cash' | 'UPI' | 'Card';

export interface MenuItem {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string;
  prep_time_mins: number;
  is_veg: boolean;
  is_available: boolean;
  created_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  item_id: number | null;
  item_name: string;
  category: string;
  quantity: number;
  unit_price: number;
  notes: string;
}

export interface Order {
  id: number;
  order_code: string;
  token_number: number;
  order_type: OrderType;
  table_or_seat: string;
  customer_name: string;
  customer_phone: string;
  payment_method: PaymentMethod;
  status: OrderStatus;
  subtotal: number;
  gst_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
  cooking_started_at: string | null;
  ready_at: string | null;
  completed_at: string | null;
  items: OrderItem[];
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes: string;
}

export interface CreateOrderPayload {
  order_type: OrderType;
  table_or_seat: string;
  customer_name: string;
  customer_phone: string;
  payment_method: PaymentMethod;
  gst_rate: number;
  discount_amount: number;
  items: Array<{
    item_id: number;
    item_name: string;
    category: string;
    quantity: number;
    unit_price: number;
    notes: string;
  }>;
}

export interface DailySummary {
  today_revenue: number;
  today_orders: number;
  completed_orders: number;
  active_queue: number;
  pending_count: number;
  cooking_count: number;
  ready_count: number;
  avg_order_value: number;
  top_items: Array<{
    item_name: string;
    total_qty: number;
    total_sales: number;
  }>;
}

export interface PresenceState {
  counterCount: number;
  kitchenCount: number;
}

export interface DeviceNotification {
  id: string;
  title: string;
  message: string;
  tone: 'new-order' | 'cooking' | 'ready' | 'completed' | 'cancelled';
  order?: Order;
  createdAt: number;
}

