import express from 'express';
import { query } from '../config/db.js';

const router = express.Router();

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
      `SELECT o.id, o.status, o.total, u.full_name as customer_name, m.business_name as merchant_name,
              d.id as driver_id, u2.full_name as driver_name, o.pin_latitude, o.pin_longitude, o.created_at
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
router.post('/refunds/:order_id', async (req, res, next) => {
  try {
    const { refund_reason } = req.body;
    const result = await query(
      `UPDATE orders SET status = 'refunded', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.order_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
