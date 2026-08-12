import express from 'express';
import { query } from '../config/db.js';

const router = express.Router();

// GET all zones
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, base_delivery_fee, service_level, max_delivery_time_minutes, min_order_value
       FROM zones
       WHERE is_active = true
       ORDER BY name`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST create zone (admin)
router.post('/', async (req, res, next) => {
  try {
    const { name, base_delivery_fee, service_level, min_order_value, max_delivery_time_minutes } = req.body;
    const result = await query(
      `INSERT INTO zones (name, base_delivery_fee, service_level, min_order_value, max_delivery_time_minutes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, base_delivery_fee, service_level, min_order_value, max_delivery_time_minutes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
