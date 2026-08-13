import express from 'express';
import { query } from '../config/db.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';
import { refundSchema } from '../utils/schemas.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Every route in this file is admin-only
router.use(requireAuth, requireRole('admin'));

// GET dashboard stats
router.get('/stats', async (req, res, next) => {
  try {
    const ordersResult = await query(
      `SELECT COUNT(*) as total_orders,
              COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
              COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
       FROM orders
       WHERE created_at >= NOW() - INTERVAL '7 days'`
    );

    const driversResult = await query(
      `SELECT COUNT(*) as total_drivers,
              COUNT(CASE WHEN availability_status = 'online' THEN 1 END) as online
       FROM drivers`
    );

    const merchantsResult = await query(
      `SELECT COUNT(*) as total_merchants FROM merchants WHERE is_active = true`
    );

    res.json({
      orders: ordersResult.rows[0],
      drivers: driversResult.rows[0],
      merchants: merchantsResult.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// GET live orders
router.get('/orders', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT o.id, o.status, o.total, o.estimated_ready_time, o.scheduled_delivery_time, o.order_type,
              u.full_name as customer_name, m.business_name as merchant_name,
              d.id as driver_id, u2.full_name as driver_name, o.pin_latitude, o.pin_longitude, o.created_at,
              EXISTS (
                SELECT 1 FROM order_items oi JOIN menu_items mi ON oi.menu_item_id = mi.id
                WHERE oi.order_id = o.id AND mi.is_cold_item = true
              ) AS has_cold_items
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       JOIN users u ON c.user_id = u.id
       JOIN merchants m ON o.merchant_id = m.id
       LEFT JOIN drivers d ON o.driver_id = d.id
       LEFT JOIN users u2 ON d.user_id = u2.id
       WHERE o.status NOT IN ('delivered', 'cancelled', 'refunded')
       ORDER BY o.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST issue refund
router.post('/refunds/:order_id', writeLimiter, validateBody(refundSchema), async (req, res, next) => {
  try {
    const { refund_reason } = req.body;
    const result = await query(
      `UPDATE orders SET status = 'refunded', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.order_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (refund_reason) {
      await query(
        `INSERT INTO support_tickets (order_id, customer_id, issue_type, description, resolution, status)
         VALUES ($1, $2, 'refund', $3, 'Refund issued by admin', 'resolved')`,
        [req.params.order_id, result.rows[0].customer_id, refund_reason]
      );
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET all drivers with lifetime earnings, for the admin driver management view
router.get('/drivers', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT d.id, u.full_name, u.phone, u.email, d.availability_status, d.cooler_kit_status,
              d.is_active, d.license_verified, d.insurance_verified, d.total_deliveries, d.avg_rating,
              COALESCE((
                SELECT SUM(o.delivery_fee + o.tip) FROM orders o
                WHERE o.driver_id = d.id AND o.status = 'delivered'
              ), 0) AS lifetime_earnings
       FROM drivers d
       JOIN users u ON d.user_id = u.id
       ORDER BY d.is_active DESC, u.full_name`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// PATCH activate/deactivate a driver account
router.patch('/drivers/:id/status', writeLimiter, async (req, res, next) => {
  try {
    const { is_active } = req.body;
    const result = await query(
      `UPDATE drivers SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [is_active, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET all merchants (including inactive) with order counts, for the admin merchant management view
router.get('/merchants', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT m.id, m.business_name, m.category, m.phone, m.hours_open, m.hours_close,
              m.commission_percent, m.is_active,
              COUNT(o.id) FILTER (WHERE o.status = 'delivered') AS delivered_orders
       FROM merchants m
       LEFT JOIN orders o ON o.merchant_id = m.id
       GROUP BY m.id
       ORDER BY m.is_active DESC, m.business_name`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// PATCH activate/deactivate a merchant
router.patch('/merchants/:id/status', writeLimiter, async (req, res, next) => {
  try {
    const { is_active } = req.body;
    const result = await query(
      `UPDATE merchants SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [is_active, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Merchant not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET all zones, including inactive, for the admin zone management view
router.get('/zones', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM zones ORDER BY is_active DESC, name');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET operational reports
router.get('/reports', async (req, res, next) => {
  try {
    const ordersPerDay = await query(
      `SELECT DATE(created_at) AS day, COUNT(*) AS order_count
       FROM orders
       WHERE created_at >= NOW() - INTERVAL '14 days'
       GROUP BY DATE(created_at)
       ORDER BY day`
    );

    const deliveryTimes = await query(
      `SELECT
         has_cold_items,
         AVG(EXTRACT(EPOCH FROM (delivered_at - created_at)) / 60) AS avg_minutes,
         COUNT(*) AS delivered_count
       FROM (
         SELECT o.id, o.created_at, o.delivered_at,
                EXISTS (
                  SELECT 1 FROM order_items oi JOIN menu_items mi ON oi.menu_item_id = mi.id
                  WHERE oi.order_id = o.id AND mi.is_cold_item = true
                ) AS has_cold_items
         FROM orders o
         WHERE o.status = 'delivered'
       ) sub
       GROUP BY has_cold_items`
    );

    const repeatCustomers = await query(
      `SELECT COUNT(*) AS repeat_customer_count FROM (
         SELECT customer_id FROM orders GROUP BY customer_id HAVING COUNT(*) > 1
       ) sub`
    );

    const totalCustomers = await query('SELECT COUNT(DISTINCT customer_id) AS total FROM orders');

    const driverUtilization = await query(
      `SELECT d.id, u.full_name, d.availability_status,
              COUNT(o.id) FILTER (WHERE o.status = 'delivered' AND o.delivered_at >= NOW() - INTERVAL '14 days') AS deliveries_last_14_days
       FROM drivers d
       JOIN users u ON d.user_id = u.id
       LEFT JOIN orders o ON o.driver_id = d.id
       WHERE d.is_active = true
       GROUP BY d.id, u.full_name, d.availability_status
       ORDER BY deliveries_last_14_days DESC`
    );

    res.json({
      orders_per_day: ordersPerDay.rows,
      delivery_time_by_cold_chain: deliveryTimes.rows,
      repeat_customers: Number(repeatCustomers.rows[0].repeat_customer_count),
      total_customers: Number(totalCustomers.rows[0].total),
      driver_utilization: driverUtilization.rows,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
