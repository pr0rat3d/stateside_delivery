import express from 'express';
import { query } from '../config/db.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';
import { supportTicketSchema } from '../utils/schemas.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// POST customer files a support ticket for their own order
router.post('/', requireAuth, requireRole('customer'), writeLimiter, validateBody(supportTicketSchema), async (req, res, next) => {
  try {
    const { order_id, issue_type, description } = req.body;
    const customer_id = req.user.customer_id;

    const orderResult = await query('SELECT id FROM orders WHERE id = $1 AND customer_id = $2', [order_id, customer_id]);
    if (orderResult.rows.length === 0) {
      return res.status(403).json({ error: 'That order does not belong to you' });
    }

    const result = await query(
      `INSERT INTO support_tickets (order_id, customer_id, issue_type, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [order_id, customer_id, issue_type, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET all tickets (admin queue), optionally filtered by status
router.get('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { status } = req.query;
    const result = await query(
      `SELECT t.*, u.full_name AS customer_name, o.total AS order_total, m.business_name AS merchant_name
       FROM support_tickets t
       JOIN customers c ON t.customer_id = c.id
       JOIN users u ON c.user_id = u.id
       LEFT JOIN orders o ON t.order_id = o.id
       LEFT JOIN merchants m ON o.merchant_id = m.id
       WHERE $1::varchar IS NULL OR t.status = $1
       ORDER BY t.created_at DESC`,
      [status || null]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// PATCH admin resolves/updates a ticket
router.patch('/:id', requireAuth, requireRole('admin'), writeLimiter, async (req, res, next) => {
  try {
    const { status, resolution } = req.body;
    const result = await query(
      `UPDATE support_tickets SET
         status = COALESCE($1, status),
         resolution = COALESCE($2, resolution),
         updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, resolution, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
