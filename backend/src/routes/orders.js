import express from 'express';
import { query } from '../config/db.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';
import { createOrderSchema } from '../utils/schemas.js';
import { sendSMS } from '../utils/sms.js';
import { sendEmail, renderOrderReceiptEmail } from '../utils/email.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

async function loadOrder(req, res, next) {
  const result = await query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Order not found' });
  }
  req.order = result.rows[0];
  next();
}

// Any of: the customer who placed it, the merchant fulfilling it, the driver assigned
// to it, or an admin. Must run after loadOrder.
function requireOrderParty(req, res, next) {
  const { user, order } = req;
  const authorized =
    user.role === 'admin' ||
    (user.role === 'customer' && user.customer_id === order.customer_id) ||
    (user.role === 'merchant' && user.merchant_id === order.merchant_id) ||
    (user.role === 'driver' && user.driver_id === order.driver_id);
  if (!authorized) return res.status(403).json({ error: 'Not authorized for this order' });
  next();
}

function requireOwningMerchant(req, res, next) {
  const { user, order } = req;
  if (user.role === 'admin' || (user.role === 'merchant' && user.merchant_id === order.merchant_id)) return next();
  return res.status(403).json({ error: 'Not authorized for this order' });
}

function requireOwningCustomer(req, res, next) {
  const { user, order } = req;
  if (user.role === 'admin' || (user.role === 'customer' && user.customer_id === order.customer_id)) return next();
  return res.status(403).json({ error: 'Not authorized for this order' });
}

function requireAssignedDriver(req, res, next) {
  const { user, order } = req;
  if (user.role === 'admin' || (user.role === 'driver' && user.driver_id === order.driver_id)) return next();
  return res.status(403).json({ error: 'Not authorized for this order' });
}

// POST create order
router.post('/', requireAuth, requireRole('customer'), writeLimiter, validateBody(createOrderSchema), async (req, res, next) => {
  try {
    const {
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
    const customer_id = req.user.customer_id;

    const zoneResult = await query('SELECT base_delivery_fee FROM zones WHERE id = $1 AND is_active = true', [zone_id]);
    if (zoneResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or inactive zone_id' });
    }

    const merchantResult = await query('SELECT id FROM merchants WHERE id = $1 AND is_active = true', [merchant_id]);
    if (merchantResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or inactive merchant_id' });
    }

    // Price and validate every item server-side — never trust client-supplied price/name,
    // since a tampered request could otherwise checkout at an arbitrary price.
    const menuItemIds = order_items.map((i) => i.menu_item_id);
    const menuItemsResult = await query(
      `SELECT id, name, price, is_available FROM menu_items WHERE id = ANY($1::int[]) AND merchant_id = $2`,
      [menuItemIds, merchant_id]
    );
    const menuItemsById = new Map(menuItemsResult.rows.map((row) => [row.id, row]));

    const pricedItems = [];
    for (const item of order_items) {
      const menuItem = menuItemsById.get(item.menu_item_id);
      if (!menuItem) {
        return res.status(400).json({ error: `Menu item ${item.menu_item_id} does not belong to this merchant` });
      }
      if (!menuItem.is_available) {
        return res.status(409).json({ error: `${menuItem.name} is no longer available` });
      }
      pricedItems.push({
        menu_item_id: menuItem.id,
        name: menuItem.name,
        price_per_unit: Number(menuItem.price),
        quantity: item.quantity,
      });
    }

    // Calculate totals from authoritative prices
    const subtotal = pricedItems.reduce((sum, item) => sum + item.price_per_unit * item.quantity, 0);
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
    for (const item of pricedItems) {
      await query(
        `INSERT INTO order_items (order_id, menu_item_id, name, quantity, price_per_unit)
         VALUES ($1, $2, $3, $4, $5)`,
        [order_id, item.menu_item_id, item.name, item.quantity, item.price_per_unit]
      );
    }

    const customerEmailResult = await query(
      `SELECT u.email FROM customers c JOIN users u ON c.user_id = u.id WHERE c.id = $1`,
      [customer_id]
    );
    const customerEmail = customerEmailResult.rows[0]?.email;
    if (customerEmail) {
      const { subject, html } = renderOrderReceiptEmail(orderResult.rows[0], pricedItems);
      sendEmail(customerEmail, subject, html);
    }

    res.status(201).json(orderResult.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET order by ID — the customer, merchant, assigned driver, or an admin
router.get('/:id', requireAuth, loadOrder, requireOrderParty, async (req, res, next) => {
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

    const itemsResult = await query('SELECT * FROM order_items WHERE order_id = $1', [req.params.id]);

    res.json({
      ...orderResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH update order status — the owning merchant (prep stages) or assigned driver (pickup/delivery), or admin
router.patch('/:id/status', requireAuth, loadOrder, requireOrderParty, writeLimiter, async (req, res, next) => {
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
router.patch('/:id/accept', requireAuth, loadOrder, requireOwningMerchant, writeLimiter, async (req, res, next) => {
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
    const order = result.rows[0];
    sendSMS(order.contact_phone, `Stateside Deliveries: your order #${order.id} was accepted — ready in about ${minutes} minutes.`);
    res.json(order);
  } catch (err) {
    next(err);
  }
});

// PATCH merchant rejects the order
router.patch('/:id/reject', requireAuth, loadOrder, requireOwningMerchant, writeLimiter, async (req, res, next) => {
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
router.patch('/:id/items/:itemId/substitute', requireAuth, loadOrder, requireOwningMerchant, writeLimiter, async (req, res, next) => {
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
router.patch('/:id/items/:itemId/substitution-response', requireAuth, loadOrder, requireOwningCustomer, writeLimiter, async (req, res, next) => {
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

// POST manually assign a driver to an order — admin only (dispatcher override, bypasses offer/accept flow)
router.post('/:id/assign-driver/:driverId', requireAuth, requireRole('admin'), writeLimiter, async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE orders SET driver_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [req.params.driverId, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = result.rows[0];

    sendSMS(order.contact_phone, `Stateside Deliveries: a driver has been assigned to your order #${order.id}.`);
    const driverResult = await query(
      `SELECT u.phone FROM drivers d JOIN users u ON d.user_id = u.id WHERE d.id = $1`,
      [req.params.driverId]
    );
    if (driverResult.rows.length > 0) {
      sendSMS(driverResult.rows[0].phone, `Stateside Deliveries: you've been assigned delivery #${order.id}. Check the app for pickup details.`);
    }

    res.json(order);
  } catch (err) {
    next(err);
  }
});

// POST record delivery proof and mark the order delivered — the assigned driver, or admin
router.post('/:id/delivery-proof', requireAuth, loadOrder, requireAssignedDriver, writeLimiter, async (req, res, next) => {
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

    sendSMS(orderResult.rows[0].contact_phone, `Stateside Deliveries: your order #${orderResult.rows[0].id} has been delivered. Enjoy!`);

    res.status(201).json(orderResult.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
