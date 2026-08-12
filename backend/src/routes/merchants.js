import express from 'express';
import { query } from '../config/db.js';

const router = express.Router();

// GET all merchants
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

// GET merchant by ID with menu
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

// POST create merchant (stub)
router.post('/', async (req, res, next) => {
  try {
    const { user_id, business_name, category, phone, hours_open, hours_close } = req.body;
    const result = await query(
      `INSERT INTO merchants (user_id, business_name, category, phone, hours_open, hours_close)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [user_id, business_name, category, phone, hours_open, hours_close]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
