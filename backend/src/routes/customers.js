import express from 'express';
import { query } from '../config/db.js';
import { requireAuth, requireSelfOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET customer profile — the customer themself, or an admin
router.get('/:id', requireAuth, requireSelfOrAdmin('id', 'customer_id'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT c.id, u.email, u.full_name, u.phone, c.default_address, c.default_pin_lat, c.default_pin_lng
       FROM customers c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
