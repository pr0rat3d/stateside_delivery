import express from 'express';
import { query } from '../config/db.js';

const router = express.Router();

// POST create payment intent (Stripe stub)
router.post('/intent', async (req, res, next) => {
  try {
    const { order_id, amount } = req.body;

    // In Phase 6, this will call Stripe API
    // For now, just create a payment record
    const result = await query(
      `INSERT INTO payments (order_id, amount, status)
       VALUES ($1, $2, 'pending')
       RETURNING *`,
      [order_id, amount]
    );

    res.status(201).json({
      payment_id: result.rows[0].id,
      amount,
      status: 'pending',
      message: 'Payment intent created (Stripe integration in Phase 6)',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
