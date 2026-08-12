import express from 'express';
import { query } from '../config/db.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import { sendSMS } from '../utils/sms.js';

const router = express.Router();

// GET all drivers (admin view)
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT d.id, u.full_name, u.phone, d.availability_status, d.cooler_kit_status, d.total_deliveries, d.avg_rating
       FROM drivers d
       JOIN users u ON d.user_id = u.id
       ORDER BY d.availability_status DESC`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET driver by ID
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT d.*, u.email, u.phone, u.full_name
       FROM drivers d
       JOIN users u ON d.user_id = u.id
       WHERE d.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH update driver availability
router.patch('/:id/availability', writeLimiter, async (req, res, next) => {
  try {
    const { availability_status } = req.body;
    const result = await query(
      `UPDATE drivers SET availability_status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [availability_status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH confirm cooler kit
router.patch('/:id/cooler-kit', writeLimiter, async (req, res, next) => {
  try {
    const { cooler_kit_status } = req.body;
    const result = await query(
      `UPDATE drivers SET cooler_kit_status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [cooler_kit_status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET orders available to be offered to this driver
router.get('/:id/available-orders', async (req, res, next) => {
  try {
    const driverResult = await query('SELECT cooler_kit_status FROM drivers WHERE id = $1', [req.params.id]);
    if (driverResult.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    const hasCoolerKit = driverResult.rows[0].cooler_kit_status;

    const result = await query(
      `SELECT o.id, o.status, o.total, o.delivery_fee, o.pin_latitude, o.pin_longitude, o.delivery_notes,
              o.landmark, o.villa_building_name, o.villa_unit, o.order_type, o.scheduled_delivery_time,
              o.created_at, m.business_name AS merchant_name, m.address AS merchant_address,
              u.full_name AS customer_name,
              EXISTS (
                SELECT 1 FROM order_items oi JOIN menu_items mi ON oi.menu_item_id = mi.id
                WHERE oi.order_id = o.id AND mi.is_cold_item = true
              ) AS has_cold_items
       FROM orders o
       JOIN merchants m ON o.merchant_id = m.id
       JOIN customers c ON o.customer_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE o.driver_id IS NULL AND o.status NOT IN ('delivered', 'cancelled', 'refunded')
       ORDER BY has_cold_items DESC, o.created_at ASC`
    );

    const offers = hasCoolerKit ? result.rows : result.rows.filter((o) => !o.has_cold_items);
    res.json(offers);
  } catch (err) {
    next(err);
  }
});

// GET this driver's current active delivery, if any
router.get('/:id/active-order', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT o.*, m.business_name AS merchant_name, m.address AS merchant_address,
              u.full_name AS customer_name,
              EXISTS (
                SELECT 1 FROM order_items oi JOIN menu_items mi ON oi.menu_item_id = mi.id
                WHERE oi.order_id = o.id AND mi.is_cold_item = true
              ) AS has_cold_items
       FROM orders o
       JOIN merchants m ON o.merchant_id = m.id
       JOIN customers c ON o.customer_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE o.driver_id = $1 AND o.status NOT IN ('delivered', 'cancelled', 'refunded')
       ORDER BY o.created_at DESC
       LIMIT 1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.json(null);
    }
    const itemsResult = await query('SELECT * FROM order_items WHERE order_id = $1', [result.rows[0].id]);
    res.json({ ...result.rows[0], items: itemsResult.rows });
  } catch (err) {
    next(err);
  }
});

// GET this driver's completed delivery history + earnings
router.get('/:id/deliveries', async (req, res, next) => {
  try {
    const deliveries = await query(
      `SELECT o.id, o.total, o.delivery_fee, o.tip, o.delivered_at, m.business_name AS merchant_name
       FROM orders o
       JOIN merchants m ON o.merchant_id = m.id
       WHERE o.driver_id = $1 AND o.status = 'delivered'
       ORDER BY o.delivered_at DESC`,
      [req.params.id]
    );
    const earnings = deliveries.rows.reduce(
      (sum, d) => sum + Number(d.delivery_fee) + Number(d.tip),
      0
    );
    res.json({ deliveries: deliveries.rows, earnings: Math.round(earnings * 100) / 100 });
  } catch (err) {
    next(err);
  }
});

// POST driver accepts an offered order
router.post('/:id/accept-order/:orderId', writeLimiter, async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE orders SET driver_id = $1, updated_at = NOW()
       WHERE id = $2 AND driver_id IS NULL
       RETURNING *`,
      [req.params.id, req.params.orderId]
    );
    if (result.rows.length === 0) {
      return res.status(409).json({ error: 'Order is no longer available' });
    }
    const order = result.rows[0];
    sendSMS(order.contact_phone, `Stateside Deliveries: a driver has been assigned to your order #${order.id}.`);
    res.json(order);
  } catch (err) {
    next(err);
  }
});

// POST driver declines an offered order (no persistence yet, ack only)
router.post('/:id/decline-order/:orderId', writeLimiter, async (req, res, next) => {
  res.json({ declined: true, order_id: Number(req.params.orderId) });
});

export default router;
