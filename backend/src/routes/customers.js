import express from 'express';
import { query } from '../config/db.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';
import { createCustomerSchema } from '../utils/schemas.js';

const router = express.Router();

// GET customer profile
router.get('/:id', async (req, res, next) => {
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

// POST register customer (stub)
router.post('/', writeLimiter, validateBody(createCustomerSchema), async (req, res, next) => {
  try {
    const { email, full_name, phone } = req.body;
    // First create user
    const userResult = await query(
      `INSERT INTO users (email, full_name, phone, role)
       VALUES ($1, $2, $3, 'customer')
       RETURNING id`,
      [email, full_name, phone]
    );
    const user_id = userResult.rows[0].id;

    // Then create customer
    const customerResult = await query(
      `INSERT INTO customers (user_id) VALUES ($1) RETURNING *`,
      [user_id]
    );
    res.status(201).json(customerResult.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
