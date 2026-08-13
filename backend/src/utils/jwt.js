import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const EXPIRES_IN = process.env.JWT_EXPIRE || '7d';

if (SECRET === 'your_super_secret_jwt_key_change_in_production') {
  console.log('⚠ JWT_SECRET is still the placeholder value — fine for local dev, must be rotated before real deployment.');
}

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}
