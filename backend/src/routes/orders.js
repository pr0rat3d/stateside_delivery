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
      tip,
    } = req.body;

    const zoneResult = await query('SELECT base_delivery_fee FROM zones WHERE id = $1', [zone_id]);
    if (zoneResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid zone_id' });
    }

    // Calculate totals
    const subtotal = order_items.reduce((sum, item) => sum + item.price_per_unit * item.quantity, 0);
    const delivery_fee = Number(zoneResult.rows[0].base_delivery_fee);
    const service_fee = subtotal * 0.03;
    const tax = subtotal * 0.05;
    const tip_amount = tip || 0;
    const total = subtotal + delivery_fee + service_fee + tax + tip_amount;

    // Create order
    const orderResult = await query(
      `INSERT INTO orders (
        customer_id, merchant_id, zone_id, pin_latitude, pin_longitude,
        delivery_notes, gate_code, villa_building_name, villa_unit, landmark,
        contact_phone, substitution_policy, subtotal, delivery_fee, service_fee, tax, tip, total,
        order_type, scheduled_delivery_time, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 'pending')
      RETURNING *`,
      [
        customer_id, merchant_id, zone_id, pin_latitude, pin_longitude,
        delivery_notes, gate_code, villa_building_name, villa_unit, landmark,
        contact_phone, substitution_policy, subtotal, delivery_fee, service_fee, tax, tip_amount, total,
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
    const orderResult = await query(
      `SELECT o.*, u.full_name AS customer_name, m.business_name AS merchant_name, du.full_name AS driver_name
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       JOIN users u ON c.user_id = u.id
       JOIN merchants m ON o.merchant_id = m.id
       LEFT JOIN drivers d ON o.driver_id = d.id
       LEFT JOIN users du ON d.user_id = du.id
       WHERE o.id = $1`,
      [req.params.id]
    );
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
      `UPDATE orders SET status = $1::varchar, updated_at = NOW(),
              delivered_at = CASE WHEN $1::varchar = 'delivered' THEN NOW() ELSE delivered_at END
       WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH merchant accepts the order with a prep time estimate
router.patch('/:id/accept', async (req, res, next) => {
  try {
    const { estimated_prep_minutes } = req.body;
    const minutes = Number(estimated_prep_minutes) || 15;
    const result = await query(
      `UPDATE orders SET status = 'accepted', updated_at = NOW(),
              estimated_ready_time = NOW() + ($1 || ' minutes')::interval
       WHERE id = $2 AND status = 'pending' RETURNING *`,
      [minutes, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(409).json({ error: 'Order is not awaiting acceptance' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH merchant rejects the order
router.patch('/:id/reject', async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE orders SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND status = 'pending' RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(409).json({ error: 'Order is not awaiting acceptance' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH merchant proposes a substitution for an out-of-stock item (text-based note; no photo storage in MVP)
router.patch('/:id/items/:itemId/substitute', async (req, res, next) => {
  try {
    const { substitution_notes } = req.body;
    const result = await query(
      `UPDATE order_items SET substitution_status = 'awaiting_approval', substitution_notes = $1
       WHERE id = $2 AND order_id = $3 RETURNING *`,
      [substitution_notes, req.params.itemId, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order item not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH customer responds to a proposed substitution
router.patch('/:id/items/:itemId/substitution-response', async (req, res, next) => {
  try {
    const { approved } = req.body;
    const itemResult = await query(
      `SELECT * FROM order_items WHERE id = $1 AND order_id = $2 AND substitution_status = 'awaiting_approval'`,
      [req.params.itemId, req.params.id]
    );
    if (itemResult.rows.length === 0) {
      return res.status(409).json({ error: 'No substitution is awaiting approval for this item' });
    }
    const item = itemResult.rows[0];

    if (approved) {
      await query(`UPDATE order_items SET substitution_status = 'approved' WHERE id = $1`, [item.id]);
    } else {
      await query(`UPDATE order_items SET substitution_status = 'refunded' WHERE id = $1`, [item.id]);
      const refundAmount = Number(item.price_per_unit) * item.quantity;
      await query(
        `UPDATE orders SET subtotal = subtotal - $1, total = total - $1, updated_at = NOW() WHERE id = $2`,
        [refundAmount, req.params.id]
      );
    }

    const orderResult = await query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    const itemsResult = await query('SELECT * FROM order_items WHERE order_id = $1', [req.params.id]);
    res.json({ ...orderResult.rows[0], items: itemsResult.rows });
  } catch (err) {
    next(err);
  }
});

// POST manually assign a driver to an order (dispatcher override, bypasses offer/accept flow)
router.post('/:id/assign-driver/:driverId', async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE orders SET driver_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [req.params.driverId, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST record delivery proof and mark the order delivered
router.post('/:id/delivery-proof', async (req, res, next) => {
  try {
    const { proof_type, proof_url, latitude, longitude, driver_id } = req.body;

    await query(
      `INSERT INTO delivery_proofs (order_id, proof_type, proof_url, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.params.id, proof_type, proof_url || null, latitude || null, longitude || null]
    );

    const orderResult = await query(
      `UPDATE orders SET status = 'delivered', delivered_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    if (driver_id) {
      await query(
        `UPDATE drivers SET total_deliveries = total_deliveries + 1, updated_at = NOW() WHERE id = $1`,
        [driver_id]
      );
    }

    res.status(201).json(orderResult.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
