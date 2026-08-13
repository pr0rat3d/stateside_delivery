import express from 'express';
import { query } from '../config/db.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { registerCustomerSchema, registerDriverSchema, registerMerchantSchema, loginSchema } from '../utils/schemas.js';

const router = express.Router();

async function emailTaken(email) {
  const result = await query('SELECT id FROM users WHERE email = $1', [email]);
  return result.rows.length > 0;
}

function tokenPayloadFor(user, roleRow, roleIdField) {
  return {
    user_id: user.id,
    role: user.role,
    full_name: user.full_name,
    email: user.email,
    [roleIdField]: roleRow.id,
  };
}

// POST customer self-registration
router.post('/register/customer', authLimiter, validateBody(registerCustomerSchema), async (req, res, next) => {
  try {
    const { email, password, full_name, phone } = req.body;
    if (await emailTaken(email)) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const password_hash = await hashPassword(password);
    const userResult = await query(
      `INSERT INTO users (email, password_hash, full_name, phone, role) VALUES ($1, $2, $3, $4, 'customer') RETURNING *`,
      [email, password_hash, full_name, phone || null]
    );
    const user = userResult.rows[0];

    const customerResult = await query(
      `INSERT INTO customers (user_id) VALUES ($1) RETURNING *`,
      [user.id]
    );

    const token = signToken(tokenPayloadFor(user, customerResult.rows[0], 'customer_id'));
    res.status(201).json({ token, role: 'customer', customer_id: customerResult.rows[0].id, full_name: user.full_name });
  } catch (err) {
    next(err);
  }
});

// POST driver self-registration (starts unverified — license/insurance/background checks pending)
router.post('/register/driver', authLimiter, validateBody(registerDriverSchema), async (req, res, next) => {
  try {
    const { email, password, full_name, phone, license_number } = req.body;
    if (await emailTaken(email)) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const password_hash = await hashPassword(password);
    const userResult = await query(
      `INSERT INTO users (email, password_hash, full_name, phone, role) VALUES ($1, $2, $3, $4, 'driver') RETURNING *`,
      [email, password_hash, full_name, phone || null]
    );
    const user = userResult.rows[0];

    const driverResult = await query(
      `INSERT INTO drivers (user_id, license_number) VALUES ($1, $2) RETURNING *`,
      [user.id, license_number]
    );

    const token = signToken(tokenPayloadFor(user, driverResult.rows[0], 'driver_id'));
    res.status(201).json({ token, role: 'driver', driver_id: driverResult.rows[0].id, full_name: user.full_name });
  } catch (err) {
    next(err);
  }
});

// POST merchant self-registration (starts inactive until admin activates it)
router.post('/register/merchant', authLimiter, validateBody(registerMerchantSchema), async (req, res, next) => {
  try {
    const { email, password, full_name, phone, business_name, category, hours_open, hours_close } = req.body;
    if (await emailTaken(email)) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const password_hash = await hashPassword(password);
    const userResult = await query(
      `INSERT INTO users (email, password_hash, full_name, phone, role) VALUES ($1, $2, $3, $4, 'merchant') RETURNING *`,
      [email, password_hash, full_name, phone || null]
    );
    const user = userResult.rows[0];

    const merchantResult = await query(
      `INSERT INTO merchants (user_id, business_name, category, phone, hours_open, hours_close, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, false) RETURNING *`,
      [user.id, business_name, category, phone || null, hours_open || null, hours_close || null]
    );

    const token = signToken(tokenPayloadFor(user, merchantResult.rows[0], 'merchant_id'));
    res.status(201).json({
      token,
      role: 'merchant',
      merchant_id: merchantResult.rows[0].id,
      full_name: user.full_name,
      message: 'Registered — your storefront is inactive until an admin approves it.',
    });
  } catch (err) {
    next(err);
  }
});

// POST login (any role)
router.post('/login', authLimiter, validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const userResult = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const user = userResult.rows[0];

    if (!user.password_hash || !(await comparePassword(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    let roleRow;
    let roleIdField;
    if (user.role === 'customer') {
      roleIdField = 'customer_id';
      roleRow = (await query('SELECT id FROM customers WHERE user_id = $1', [user.id])).rows[0];
    } else if (user.role === 'driver') {
      roleIdField = 'driver_id';
      roleRow = (await query('SELECT id FROM drivers WHERE user_id = $1', [user.id])).rows[0];
    } else if (user.role === 'merchant') {
      roleIdField = 'merchant_id';
      roleRow = (await query('SELECT id FROM merchants WHERE user_id = $1', [user.id])).rows[0];
    } else {
      roleIdField = null;
      roleRow = { id: user.id };
    }

    if (!roleRow) {
      return res.status(500).json({ error: 'Account is missing its role profile — contact support' });
    }

    const payload = {
      user_id: user.id,
      role: user.role,
      full_name: user.full_name,
      email: user.email,
      ...(roleIdField ? { [roleIdField]: roleRow.id } : {}),
    };
    const token = signToken(payload);

    res.json({ token, role: user.role, full_name: user.full_name, ...(roleIdField ? { [roleIdField]: roleRow.id } : {}) });
  } catch (err) {
    next(err);
  }
});

// GET current authenticated user (validates the token is still good and refreshes client-side state)
router.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

export default router;
