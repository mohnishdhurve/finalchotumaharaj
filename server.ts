import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { Server as SocketIOServer } from 'socket.io';
import {
  createMenuItem,
  createOrder,
  deleteMenuItem,
  getActiveOrders,
  getAllMenuItems,
  getDailySummary,
  getOrderById,
  getOrders,
  initDatabase,
  updateMenuItem,
  updateOrderStatus,
} from './server/db.ts';
import type { CreateOrderPayload, OrderStatus } from './src/types.ts';

const PORT = Number(process.env.PORT || 3000);
const VALID_STATUSES: ReadonlySet<string> = new Set([
  'Pending',
  'Cooking',
  'Ready',
  'Completed',
  'Cancelled',
]);

async function startServer(): Promise<void> {
  initDatabase();

  const app = express();
  const httpServer = http.createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    },
  });

  app.use(express.json());

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'chat-maharaja-pos-kds' });
  });

  // Menu API
  app.get('/api/menu', (_req, res) => {
    try {
      const items = getAllMenuItems();
      res.json(items);
    } catch (err) {
      console.error('GET /api/menu error:', err);
      res.status(500).json({ error: 'Failed to load menu items' });
    }
  });

  app.post('/api/menu', (req, res) => {
    try {
      const { name, category, price, description, prep_time_mins, is_veg, is_available } = req.body;
      if (!name || !category || price === undefined || Number.isNaN(Number(price)) || Number(price) < 0) {
        res.status(400).json({ error: 'Name, category, and valid price are required' });
        return;
      }
      const created = createMenuItem({
        name: String(name),
        category: String(category),
        price: Number(price),
        description: description ? String(description) : '',
        prep_time_mins: prep_time_mins ? Number(prep_time_mins) : 12,
        is_veg: is_veg !== false,
        is_available: is_available !== false,
      });
      io.emit('menu_synced', getAllMenuItems());
      res.status(201).json(created);
    } catch (err) {
      console.error('POST /api/menu error:', err);
      res.status(500).json({ error: 'Failed to create menu item' });
    }
  });

  app.patch('/api/menu/:id', (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        res.status(400).json({ error: 'Invalid menu item ID' });
        return;
      }
      const updated = updateMenuItem(id, req.body);
      if (!updated) {
        res.status(404).json({ error: 'Menu item not found' });
        return;
      }
      io.emit('menu_synced', getAllMenuItems());
      res.json(updated);
    } catch (err) {
      console.error('PATCH /api/menu/:id error:', err);
      res.status(500).json({ error: 'Failed to update menu item' });
    }
  });

  app.delete('/api/menu/:id', (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        res.status(400).json({ error: 'Invalid menu item ID' });
        return;
      }
      const deleted = deleteMenuItem(id);
      if (!deleted) {
        res.status(404).json({ error: 'Menu item not found' });
        return;
      }
      io.emit('menu_synced', getAllMenuItems());
      res.json({ deleted: true, id });
    } catch (err) {
      console.error('DELETE /api/menu/:id error:', err);
      res.status(500).json({ error: 'Failed to delete menu item' });
    }
  });

  // Orders API
  app.get('/api/orders/active', (_req, res) => {
    try {
      res.json(getActiveOrders());
    } catch (err) {
      console.error('GET /api/orders/active error:', err);
      res.status(500).json({ error: 'Failed to load active orders' });
    }
  });

  app.get('/api/orders', (req, res) => {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const rangeParam = typeof req.query.range === 'string' ? req.query.range : undefined;
      const range =
        rangeParam === 'today' || rangeParam === '7d' || rangeParam === 'all' ? rangeParam : 'all';
      res.json(getOrders({ status, search, range }));
    } catch (err) {
      console.error('GET /api/orders error:', err);
      res.status(500).json({ error: 'Failed to load orders' });
    }
  });

  app.get('/api/orders/:id', (req, res) => {
    try {
      const id = Number(req.params.id);
      const order = getOrderById(id);
      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }
      res.json(order);
    } catch (err) {
      console.error('GET /api/orders/:id error:', err);
      res.status(500).json({ error: 'Failed to fetch order' });
    }
  });

  app.post('/api/orders', (req, res) => {
    try {
      const body = req.body as CreateOrderPayload;
      if (!body || !Array.isArray(body.items) || body.items.length === 0) {
        res.status(400).json({ error: 'Order must contain at least one item' });
        return;
      }
      const order = createOrder(body);
      io.emit('new_order_alert', order);
      io.emit('summary_updated', getDailySummary());
      res.status(201).json(order);
    } catch (err) {
      console.error('POST /api/orders error:', err);
      res.status(500).json({ error: 'Failed to create order' });
    }
  });

  app.patch('/api/orders/:id/status', (req, res) => {
    try {
      const id = Number(req.params.id);
      const { status } = req.body as { status?: string };
      if (!status || !VALID_STATUSES.has(status)) {
        res.status(400).json({ error: 'Invalid order status' });
        return;
      }
      const updated = updateOrderStatus(id, status as OrderStatus);
      if (!updated) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }
      io.emit('order_status_synced', updated);
      io.emit('summary_updated', getDailySummary());
      res.json(updated);
    } catch (err) {
      console.error('PATCH /api/orders/:id/status error:', err);
      res.status(500).json({ error: 'Failed to update order status' });
    }
  });

  app.get('/api/summary', (_req, res) => {
    try {
      res.json(getDailySummary());
    } catch (err) {
      console.error('GET /api/summary error:', err);
      res.status(500).json({ error: 'Failed to load daily summary' });
    }
  });

  function emitPresence(): void {
    const counterCount = io.sockets.adapter.rooms.get('counter')?.size ?? 0;
    const kitchenCount = io.sockets.adapter.rooms.get('kitchen')?.size ?? 0;
    io.emit('presence_updated', { counterCount, kitchenCount });
  }

  // Socket.IO Real-Time Events (per PDF Blueprint)
  io.on('connection', (socket) => {
    socket.on('join_role', (role: string) => {
      if (role === 'counter' || role === 'kitchen') {
        const otherRole = role === 'kitchen' ? 'counter' : 'kitchen';
        void socket.leave(otherRole);
        void socket.join(role);
        emitPresence();
      }
      socket.emit('active_orders_snapshot', getActiveOrders());
      socket.emit('summary_updated', getDailySummary());
    });

    socket.on('disconnect', () => {
      emitPresence();
    });

    socket.on('sync_active_orders', () => {
      socket.emit('active_orders_snapshot', getActiveOrders());
      socket.emit('summary_updated', getDailySummary());
      emitPresence();
    });

    socket.on('create_order', (payload: CreateOrderPayload, ack?: (res: unknown) => void) => {
      try {
        if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
          ack?.({ error: 'Order must include items' });
          return;
        }
        const order = createOrder(payload);
        io.emit('new_order_alert', order);
        io.emit('summary_updated', getDailySummary());
        ack?.({ ok: true, order });
      } catch (err) {
        console.error('socket create_order error:', err);
        ack?.({ error: 'Failed to create order' });
      }
    });

    socket.on(
      'update_status',
      (data: { orderId: number; newStatus: OrderStatus }, ack?: (res: unknown) => void) => {
        try {
          if (!data || !VALID_STATUSES.has(data.newStatus)) {
            ack?.({ error: 'Invalid status' });
            return;
          }
          const updated = updateOrderStatus(Number(data.orderId), data.newStatus);
          if (!updated) {
            ack?.({ error: 'Order not found' });
            return;
          }
          io.emit('order_status_synced', updated);
          io.emit('summary_updated', getDailySummary());
          ack?.({ ok: true, order: updated });
        } catch (err) {
          console.error('socket update_status error:', err);
          ack?.({ error: 'Failed to update status' });
        }
      }
    );
  });

  // Vite dev middleware vs static production serving
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Chat Maharaja POS & KDS running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
