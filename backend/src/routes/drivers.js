import express from 'express';
import { query } from '../config/db.js';

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
router.patch('/:id/availability', async (req, res, next) => {
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
router.patch('/:id/cooler-kit', async (req, res, next) => {
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

export default router;
