import express from 'express';
import { query } from '../config/db.js';

const router = express.Router();

// POST create order
router.post('/', async (req, res, next) => {
  try {
    const {
      customer_id,
      merchant_id,
      zone_id,
      pin_latitude,
      pin_longitude,
      delivery_notes,
      gate_code,
      villa_building_name,
      villa_unit,
      landmark,
      contact_phone,
      substitution_policy,
      order_items,
      scheduled_delivery_time,
      order_type,
    } = req.body;

    // Calculate totals (stub)
    const subtotal = order_items.reduce((sum, item) => sum + item.price_per_unit * item.quantity, 0);
    const delivery_fee = 5.00; // Zone-based; calculate later
    const service_fee = subtotal * 0.03;
    const tax = subtotal * 0.05;
    const total = subtotal + delivery_fee + service_fee + tax;

    // Create order
    const orderResult = await query(
      `INSERT INTO orders (
        customer_id, merchant_id, zone_id, pin_latitude, pin_longitude,
        delivery_notes, gate_code, villa_building_name, villa_unit, landmark,
        contact_phone, substitution_policy, subtotal, delivery_fee, service_fee, tax, total,
        order_type, scheduled_delivery_time, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 'pending')
      RETURNING *`,
      [
        customer_id, merchant_id, zone_id, pin_latitude, pin_longitude,
        delivery_notes, gate_code, villa_building_name, villa_unit, landmark,
        contact_phone, substitution_policy, subtotal, delivery_fee, service_fee, tax, total,
        order_type, scheduled_delivery_time,
      ]
    );

    const order_id = orderResult.rows[0].id;

    // Add order items
    for (const item of order_items) {
      await query(
        `INSERT INTO order_items (order_id, menu_item_id, name, quantity, price_per_unit)
         VALUES ($1, $2, $3, $4, $5)`,
        [order_id, item.menu_item_id, item.name, item.quantity, item.price_per_unit]
      );
    }

    res.status(201).json(orderResult.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET order by ID
router.get('/:id', async (req, res, next) => {
  try {
    const orderResult = await query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const itemsResult = await query('SELECT * FROM order_items WHERE order_id = $1', [req.params.id]);

    res.json({
      ...orderResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH update order status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const result = await query(
      `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
