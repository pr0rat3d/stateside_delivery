import express from 'express';
import { query } from '../config/db.js';
import { stripe, stripeConfigured } from '../utils/stripe.js';
import { paymentLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';
import { paymentIntentSchema } from '../utils/schemas.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// POST create payment intent — real Stripe PaymentIntent when configured, mock otherwise
router.post('/intent', requireAuth, requireRole('customer'), paymentLimiter, validateBody(paymentIntentSchema), async (req, res, next) => {
  try {
    const { order_id, amount } = req.body;

    const orderResult = await query('SELECT total, customer_id FROM orders WHERE id = $1', [order_id]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (orderResult.rows[0].customer_id !== req.user.customer_id) {
      return res.status(403).json({ error: 'That order does not belong to you' });
    }

    if (stripeConfigured) {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(Number(orderResult.rows[0].total) * 100), // Stripe expects cents
        currency: 'usd',
        metadata: { order_id: String(order_id) },
        automatic_payment_methods: { enabled: true },
      });

      const result = await query(
        `INSERT INTO payments (order_id, amount, payment_method, stripe_payment_intent_id, status)
         VALUES ($1, $2, 'card', $3, 'pending')
         RETURNING *`,
        [order_id, amount, paymentIntent.id]
      );

      return res.status(201).json({
        payment_id: result.rows[0].id,
        client_secret: paymentIntent.client_secret,
        amount,
        status: 'pending',
      });
    }

    // Mock fallback — no Stripe account configured yet
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
      message: 'Mock payment intent (Stripe not configured — see backend/README.md to enable real payments)',
    });
  } catch (err) {
    next(err);
  }
});

// POST mark a mock payment as succeeded (only used when Stripe isn't configured —
// with real Stripe, the webhook below is the source of truth instead)
router.post('/intent/:id/confirm-mock', requireAuth, requireRole('customer'), paymentLimiter, async (req, res, next) => {
  try {
    if (stripeConfigured) {
      return res.status(409).json({ error: 'Stripe is configured; confirm payment via Stripe, not this endpoint' });
    }
    const ownerResult = await query(
      `SELECT o.customer_id FROM payments p JOIN orders o ON p.order_id = o.id WHERE p.id = $1`,
      [req.params.id]
    );
    if (ownerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    if (ownerResult.rows[0].customer_id !== req.user.customer_id) {
      return res.status(403).json({ error: 'That payment does not belong to you' });
    }

    const result = await query(
      `UPDATE payments SET status = 'succeeded', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Stripe webhook — verifies the signature against the raw body and updates payment status.
// Mounted separately in server.js with express.raw() before the JSON body parser applies.
export async function stripeWebhookHandler(req, res) {
  if (!stripeConfigured || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).send('Stripe webhook not configured');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object;
      await query(
        `UPDATE payments SET status = 'succeeded', stripe_charge_id = $1, updated_at = NOW()
         WHERE stripe_payment_intent_id = $2`,
        [intent.latest_charge || null, intent.id]
      );
    } else if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object;
      await query(
        `UPDATE payments SET status = 'failed', updated_at = NOW() WHERE stripe_payment_intent_id = $1`,
        [intent.id]
      );
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook handling error:', err);
    res.status(500).send('Webhook handler error');
  }
}

export default router;
