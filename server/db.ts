import type {
  CreateOrderPayload,
  DailySummary,
  MenuItem,
  Order,
  OrderItem,
  OrderStatus,
} from '../src/types.ts';

interface SeedItem {
  name: string;
  category: string;
  price: number;
  description?: string;
  prep_time_mins?: number;
}

const INITIAL_MENU_SEED: SeedItem[] = [
  // Chinese Starter
  { name: 'Paneer 65', category: 'Chinese Starter', price: 150, prep_time_mins: 12 },
  { name: 'Chilli Paneer', category: 'Chinese Starter', price: 150, prep_time_mins: 12 },
  { name: 'Crispy Paneer', category: 'Chinese Starter', price: 140, prep_time_mins: 12 },
  { name: 'Crispy Corn', category: 'Chinese Starter', price: 130, prep_time_mins: 10 },
  { name: 'Veg Gravy Manchurian', category: 'Chinese Starter', price: 130, prep_time_mins: 12 },
  { name: 'Masala Corn', category: 'Chinese Starter', price: 120, prep_time_mins: 8 },
  { name: 'Veg Manchurian Dry', category: 'Chinese Starter', price: 110, prep_time_mins: 12 },
  { name: 'Sweet Butter Corn', category: 'Chinese Starter', price: 100, prep_time_mins: 6 },

  // Noodles & Rice
  { name: 'Paneer Fried Rice', category: 'Noodles & Rice', price: 199, prep_time_mins: 14 },
  { name: 'Schezwan Fried Rice', category: 'Noodles & Rice', price: 170, prep_time_mins: 12 },
  { name: 'Veg Fried Rice', category: 'Noodles & Rice', price: 160, prep_time_mins: 12 },
  { name: 'Manchurian Schezwan Noodles', category: 'Noodles & Rice', price: 140, prep_time_mins: 14 },
  { name: 'Schezwan Noodles', category: 'Noodles & Rice', price: 130, prep_time_mins: 12 },
  { name: 'Veg Hakka Noodles', category: 'Noodles & Rice', price: 110, prep_time_mins: 12 },

  // Maggie
  { name: 'Plain Masala Maggie', category: 'Maggie', price: 60, prep_time_mins: 8 },
  { name: 'Veg Cheese Maggie', category: 'Maggie', price: 80, prep_time_mins: 10 },
  { name: 'Vegetable Maggie', category: 'Maggie', price: 70, prep_time_mins: 9 },
  { name: 'Punjabi Tadka Maggie', category: 'Maggie', price: 80, prep_time_mins: 10 },

  // Pizza
  { name: 'Margherita Pizza', category: 'Pizza', price: 150, prep_time_mins: 15 },
  { name: 'Veg Tandoori Pizza', category: 'Pizza', price: 150, prep_time_mins: 15 },
  { name: 'Veg Pardesi Pizza', category: 'Pizza', price: 120, prep_time_mins: 14 },

  // French Fries
  { name: 'Special French Fries', category: 'French Fries', price: 70, prep_time_mins: 8 },
  { name: 'Plain French Fries', category: 'French Fries', price: 60, prep_time_mins: 7 },
  { name: 'Peri-Peri French Fries', category: 'French Fries', price: 90, prep_time_mins: 8 },

  // Quick Bites
  { name: 'Schezwan Spring Roll (4 pcs)', category: 'Quick Bites', price: 30, prep_time_mins: 8 },
  { name: 'Punjabi Samosa (2 pcs)', category: 'Quick Bites', price: 35, prep_time_mins: 6 },
  { name: 'Pizza Pocket (4 pcs)', category: 'Quick Bites', price: 90, prep_time_mins: 10 },

  // Sandwich
  { name: 'Corn Cheese Sandwich', category: 'Sandwich', price: 80, prep_time_mins: 10 },
  { name: 'Paneer Cheese Sandwich', category: 'Sandwich', price: 90, prep_time_mins: 10 },
  { name: 'Vegetable Sandwich', category: 'Sandwich', price: 70, prep_time_mins: 8 },
  { name: 'Garlic Bread', category: 'Sandwich', price: 50, prep_time_mins: 8 },

  // Tea & Coffee
  { name: 'Masala Tea', category: 'Tea & Coffee', price: 20, prep_time_mins: 4 },
  { name: 'Black Tea', category: 'Tea & Coffee', price: 15, prep_time_mins: 4 },
  { name: 'Lemon Tea', category: 'Tea & Coffee', price: 15, prep_time_mins: 4 },
  { name: 'Sugar Free Tea', category: 'Tea & Coffee', price: 20, prep_time_mins: 4 },
  { name: 'Hot Coffee', category: 'Tea & Coffee', price: 30, prep_time_mins: 5 },

  // Popcorn
  { name: 'Cheese Popcorn', category: 'Popcorn', price: 100, prep_time_mins: 4 },
  { name: 'Peri Peri Popcorn', category: 'Popcorn', price: 80, prep_time_mins: 4 },
  { name: 'Popcorn Silver Salted', category: 'Popcorn', price: 60, prep_time_mins: 3 },

  // Shake
  { name: 'Cold Coffee with Ice Cream', category: 'Shakes', price: 100, prep_time_mins: 6 },
  { name: 'Cold Coffee without Ice Cream', category: 'Shakes', price: 90, prep_time_mins: 5 },
  { name: 'Kit Kat Shake', category: 'Shakes', price: 120, prep_time_mins: 6 },
  { name: 'Oreo Shake', category: 'Shakes', price: 130, prep_time_mins: 6 },

  // Burgers
  { name: 'Aloo Tikki Burger', category: 'Burgers', price: 80, prep_time_mins: 10 },
  { name: 'Cheese Tikki Burger', category: 'Burgers', price: 90, prep_time_mins: 10 },
  { name: 'Vegetable Burger', category: 'Burgers', price: 100, prep_time_mins: 10 },

  // Combos
  {
    name: 'Pizza Pocket Combo',
    category: 'Combos',
    price: 180,
    description: 'Cold Drink + Salted Popcorn + Pizza Pocket (4 pcs)',
    prep_time_mins: 12,
  },
  {
    name: 'Cheese Corn Nugget Combo',
    category: 'Combos',
    price: 150,
    description: 'Cold Drink + Salted Popcorn + Cheese Corn Nugget (4 pcs)',
    prep_time_mins: 12,
  },
  {
    name: 'French Fries Combo',
    category: 'Combos',
    price: 160,
    description: 'Cold Drink + Salted Popcorn + French Fries',
    prep_time_mins: 10,
  },
  {
    name: 'Punjabi Samosa Combo',
    category: 'Combos',
    price: 120,
    description: 'Cold Drink + Salted Popcorn + Punjabi Samosa (2 pcs)',
    prep_time_mins: 8,
  },
  {
    name: 'Schezwan Spring Roll Combo',
    category: 'Combos',
    price: 150,
    description: 'Cold Drink + Salted Popcorn + Schezwan Spring Roll (4 pcs)',
    prep_time_mins: 10,
  },
];

// MOCKED — in-memory store replacing native better-sqlite3; data resets on container sleep
const menuItemsStore: MenuItem[] = [];
const ordersStore: Order[] = [];
let nextMenuItemId = 1;
let nextOrderId = 1;
let nextOrderItemId = 1;

function cloneOrder(order: Order): Order {
  return {
    ...order,
    items: order.items.map((item) => ({ ...item })),
  };
}

export function initDatabase(): void {
  if (menuItemsStore.length > 0) return;

  const now = new Date().toISOString();
  for (const item of INITIAL_MENU_SEED) {
    menuItemsStore.push({
      id: nextMenuItemId++,
      name: item.name,
      category: item.category,
      price: item.price,
      description: item.description ?? '',
      prep_time_mins: item.prep_time_mins ?? 12,
      is_veg: true,
      is_available: true,
      created_at: now,
    });
  }
}

export function getAllMenuItems(): MenuItem[] {
  return [...menuItemsStore]
    .sort((a, b) => {
      const catCmp = a.category.localeCompare(b.category);
      return catCmp !== 0 ? catCmp : a.name.localeCompare(b.name);
    })
    .map((item) => ({ ...item }));
}

export function createMenuItem(input: {
  name: string;
  category: string;
  price: number;
  description?: string;
  prep_time_mins?: number;
  is_veg?: boolean;
  is_available?: boolean;
}): MenuItem {
  const created: MenuItem = {
    id: nextMenuItemId++,
    name: input.name.trim(),
    category: input.category.trim(),
    price: Number(input.price),
    description: (input.description ?? '').trim(),
    prep_time_mins: Number(input.prep_time_mins ?? 12),
    is_veg: input.is_veg !== false,
    is_available: input.is_available !== false,
    created_at: new Date().toISOString(),
  };
  menuItemsStore.push(created);
  return { ...created };
}

export function updateMenuItem(
  id: number,
  updates: Partial<{
    name: string;
    category: string;
    price: number;
    description: string;
    prep_time_mins: number;
    is_veg: boolean;
    is_available: boolean;
  }>
): MenuItem | null {
  const index = menuItemsStore.findIndex((item) => item.id === id);
  if (index === -1) return null;

  const existing = menuItemsStore[index];
  const updated: MenuItem = {
    ...existing,
    name: updates.name !== undefined ? updates.name.trim() : existing.name,
    category: updates.category !== undefined ? updates.category.trim() : existing.category,
    price: updates.price !== undefined ? Number(updates.price) : existing.price,
    description:
      updates.description !== undefined ? updates.description.trim() : existing.description,
    prep_time_mins:
      updates.prep_time_mins !== undefined
        ? Number(updates.prep_time_mins)
        : existing.prep_time_mins,
    is_veg: updates.is_veg !== undefined ? Boolean(updates.is_veg) : existing.is_veg,
    is_available:
      updates.is_available !== undefined ? Boolean(updates.is_available) : existing.is_available,
  };

  menuItemsStore[index] = updated;
  return { ...updated };
}

export function deleteMenuItem(id: number): boolean {
  const index = menuItemsStore.findIndex((item) => item.id === id);
  if (index === -1) return false;
  menuItemsStore.splice(index, 1);
  return true;
}

export function getActiveOrders(): Order[] {
  return ordersStore
    .filter((o) => o.status === 'Pending' || o.status === 'Cooking' || o.status === 'Ready')
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map(cloneOrder);
}

export function getOrders(filters?: {
  status?: string;
  search?: string;
  range?: 'today' | '7d' | 'all';
}): Order[] {
  let result = [...ordersStore];

  if (filters?.status && filters.status !== 'All') {
    if (filters.status === 'Active') {
      result = result.filter(
        (o) => o.status === 'Pending' || o.status === 'Cooking' || o.status === 'Ready'
      );
    } else {
      result = result.filter((o) => o.status === filters.status);
    }
  }

  if (filters?.range === 'today') {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayIso = startOfDay.toISOString();
    result = result.filter((o) => o.created_at >= todayIso);
  } else if (filters?.range === '7d') {
    const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    result = result.filter((o) => o.created_at >= sevenDaysAgoIso);
  }

  if (filters?.search && filters.search.trim().length > 0) {
    const q = filters.search.trim().toLowerCase();
    result = result.filter(
      (o) =>
        o.order_code.toLowerCase().includes(q) ||
        String(o.token_number).toLowerCase().includes(q) ||
        o.table_or_seat.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_phone.toLowerCase().includes(q) ||
        o.items.some((item) => item.item_name.toLowerCase().includes(q))
    );
  }

  return result
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 250)
    .map(cloneOrder);
}

export function getOrderById(id: number): Order | null {
  const order = ordersStore.find((o) => o.id === id);
  return order ? cloneOrder(order) : null;
}

export function createOrder(payload: CreateOrderPayload): Order {
  const now = new Date().toISOString();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todayIso = startOfDay.toISOString();

  let maxToken = 0;
  for (const order of ordersStore) {
    if (order.created_at >= todayIso && order.token_number > maxToken) {
      maxToken = order.token_number;
    }
  }
  const tokenNumber = maxToken > 0 ? maxToken + 1 : 101;

  const subtotal = payload.items.reduce(
    (sum, item) => sum + Number(item.unit_price) * Number(item.quantity),
    0
  );
  const gstRate = Math.max(0, Number(payload.gst_rate ?? 0));
  const discountAmount = Math.max(0, Math.min(subtotal, Number(payload.discount_amount ?? 0)));
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(taxableAmount * (gstRate / 100) * 100) / 100;
  const totalAmount = Math.round((taxableAmount + taxAmount) * 100) / 100;

  const nextSeq = ordersStore.length + 1;
  const orderCode = `CM-${String(nextSeq).padStart(4, '0')}`;
  const orderId = nextOrderId++;

  const orderItems: OrderItem[] = payload.items.map((item) => ({
    id: nextOrderItemId++,
    order_id: orderId,
    item_id: item.item_id ?? null,
    item_name: item.item_name,
    category: item.category,
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
    notes: (item.notes ?? '').trim(),
  }));

  const created: Order = {
    id: orderId,
    order_code: orderCode,
    token_number: tokenNumber,
    order_type: payload.order_type,
    table_or_seat: (payload.table_or_seat ?? '').trim(),
    customer_name: (payload.customer_name ?? '').trim(),
    customer_phone: (payload.customer_phone ?? '').trim(),
    payment_method: payload.payment_method ?? 'Cash',
    status: 'Pending',
    subtotal,
    gst_rate: gstRate,
    tax_amount: taxAmount,
    discount_amount: discountAmount,
    total_amount: totalAmount,
    created_at: now,
    updated_at: now,
    cooking_started_at: null,
    ready_at: null,
    completed_at: null,
    items: orderItems,
  };

  ordersStore.push(created);
  return cloneOrder(created);
}

export function updateOrderStatus(id: number, newStatus: OrderStatus): Order | null {
  const existing = ordersStore.find((o) => o.id === id);
  if (!existing) return null;

  const now = new Date().toISOString();
  existing.status = newStatus;
  existing.updated_at = now;
  if (newStatus === 'Cooking' && !existing.cooking_started_at) {
    existing.cooking_started_at = now;
  }
  if (newStatus === 'Ready' && !existing.ready_at) {
    existing.ready_at = now;
  }
  if (newStatus === 'Completed' && !existing.completed_at) {
    existing.completed_at = now;
  }

  return cloneOrder(existing);
}

export function getDailySummary(): DailySummary {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todayIso = startOfDay.toISOString();

  let todayRevenue = 0;
  let todayOrders = 0;
  let completedOrders = 0;
  let pendingCount = 0;
  let cookingCount = 0;
  let readyCount = 0;

  const itemTotals = new Map<string, { item_name: string; total_qty: number; total_sales: number }>();

  for (const order of ordersStore) {
    if (order.status === 'Pending') pendingCount++;
    else if (order.status === 'Cooking') cookingCount++;
    else if (order.status === 'Ready') readyCount++;

    if (order.created_at >= todayIso) {
      if (order.status !== 'Cancelled') {
        todayRevenue += order.total_amount;
        todayOrders++;
        for (const item of order.items) {
          const entry = itemTotals.get(item.item_name) ?? {
            item_name: item.item_name,
            total_qty: 0,
            total_sales: 0,
          };
          entry.total_qty += item.quantity;
          entry.total_sales += item.quantity * item.unit_price;
          itemTotals.set(item.item_name, entry);
        }
      }
      if (order.status === 'Completed') {
        completedOrders++;
      }
    }
  }

  const topItems = Array.from(itemTotals.values())
    .sort((a, b) => b.total_qty - a.total_qty)
    .slice(0, 5);

  const avgOrderValue =
    todayOrders > 0 ? Math.round((todayRevenue / todayOrders) * 100) / 100 : 0;

  return {
    today_revenue: Math.round(todayRevenue * 100) / 100,
    today_orders: todayOrders,
    completed_orders: completedOrders,
    active_queue: pendingCount + cookingCount + readyCount,
    pending_count: pendingCount,
    cooking_count: cookingCount,
    ready_count: readyCount,
    avg_order_value: avgOrderValue,
    top_items: topItems,
  };
}
