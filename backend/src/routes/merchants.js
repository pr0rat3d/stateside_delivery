import express from 'express';
import { query } from '../config/db.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import { requireAuth, requireSelfOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET all merchants — public browsing
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT m.id, m.business_name, m.category, m.phone, m.hours_open, m.hours_close, m.commission_percent, m.is_active
       FROM merchants m
       WHERE m.is_active = true
       ORDER BY m.business_name`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET merchant by ID with menu — public browsing
router.get('/:id', async (req, res, next) => {
  try {
    const merchantResult = await query('SELECT * FROM merchants WHERE id = $1', [req.params.id]);
    if (merchantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    const menuResult = await query('SELECT * FROM menu_items WHERE merchant_id = $1 AND is_available = true', [req.params.id]);

    res.json({
      ...merchantResult.rows[0],
      menu_items: menuResult.rows,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH update merchant profile (hours, phone) — the merchant themself, or an admin
router.patch('/:id', requireAuth, requireSelfOrAdmin('id', 'merchant_id'), writeLimiter, async (req, res, next) => {
  try {
    const { hours_open, hours_close, phone } = req.body;
    const result = await query(
      `UPDATE merchants SET
         hours_open = COALESCE($1, hours_open),
         hours_close = COALESCE($2, hours_close),
         phone = COALESCE($3, phone),
         updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [hours_open, hours_close, phone, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Merchant not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET orders awaiting merchant action — the merchant themself, or an admin
router.get('/:id/incoming-orders', requireAuth, requireSelfOrAdmin('id', 'merchant_id'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT o.id, o.status, o.total, o.order_type, o.scheduled_delivery_time,
              o.estimated_ready_time, o.driver_id, o.created_at,
              u.full_name AS customer_name, du.full_name AS driver_name,
              EXISTS (
                SELECT 1 FROM order_items oi
                WHERE oi.order_id = o.id AND oi.substitution_status = 'awaiting_approval'
              ) AS has_pending_substitution
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       JOIN users u ON c.user_id = u.id
       LEFT JOIN drivers d ON o.driver_id = d.id
       LEFT JOIN users du ON d.user_id = du.id
       WHERE o.merchant_id = $1 AND o.status NOT IN ('delivered', 'cancelled', 'refunded')
       ORDER BY o.created_at ASC`,
      [req.params.id]
    );

    const incoming = result.rows.filter((o) => o.status === 'pending');
    const in_progress = result.rows.filter((o) => o.status !== 'pending');
    res.json({ incoming, in_progress });
  } catch (err) {
    next(err);
  }
});

// GET full menu for edit mode (includes unavailable items) — the merchant themself, or an admin
router.get('/:id/menu', requireAuth, requireSelfOrAdmin('id', 'merchant_id'), async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM menu_items WHERE merchant_id = $1 ORDER BY category, name',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// PATCH update a single menu item (availability, price) — the merchant themself, or an admin
router.patch('/:id/menu/:itemId', requireAuth, requireSelfOrAdmin('id', 'merchant_id'), writeLimiter, async (req, res, next) => {
  try {
    const { is_available, price } = req.body;
    const result = await query(
      `UPDATE menu_items SET
         is_available = COALESCE($1, is_available),
         price = COALESCE($2, price),
         updated_at = NOW()
       WHERE id = $3 AND merchant_id = $4
       RETURNING *`,
      [is_available, price, req.params.itemId, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET historical orders and revenue for this merchant — the merchant themself, or an admin
router.get('/:id/history', requireAuth, requireSelfOrAdmin('id', 'merchant_id'), async (req, res, next) => {
  try {
    const merchantResult = await query('SELECT commission_percent FROM merchants WHERE id = $1', [req.params.id]);
    if (merchantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Merchant not found' });
    }
    const commissionPercent = Number(merchantResult.rows[0].commission_percent);

    const ordersResult = await query(
      `SELECT o.id, o.status, o.subtotal, o.total, o.delivered_at, u.full_name AS customer_name
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE o.merchant_id = $1 AND o.status IN ('delivered', 'cancelled', 'refunded')
       ORDER BY o.created_at DESC`,
      [req.params.id]
    );

    const delivered = ordersResult.rows.filter((o) => o.status === 'delivered');
    const grossSubtotal = delivered.reduce((sum, o) => sum + Number(o.subtotal), 0);
    const netRevenue = grossSubtotal * (1 - commissionPercent / 100);

    res.json({
      orders: ordersResult.rows,
      summary: {
        delivered_count: delivered.length,
        gross_subtotal: Math.round(grossSubtotal * 100) / 100,
        commission_percent: commissionPercent,
        net_revenue: Math.round(netRevenue * 100) / 100,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
