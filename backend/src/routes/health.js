import express from 'express';
import { query } from '../config/db.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const result = await query('SELECT NOW()');
    res.json({
      status: 'healthy',
      timestamp: result.rows[0],
      environment: process.env.NODE_ENV,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
