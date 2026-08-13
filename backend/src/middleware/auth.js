import { verifyToken } from '../utils/jwt.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    req.user = verifyToken(header.slice('Bearer '.length));
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized for this action' });
    }
    next();
  };
}

// Allows the request through if req.user.role is 'admin', OR if the numeric id at
// req.params[paramName] matches req.user[ownIdField]. Use after requireAuth for routes
// like GET /drivers/:id/... where a driver may only act on their own resource but an
// admin may act on any.
export function requireSelfOrAdmin(paramName, ownIdField) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.role === 'admin') return next();
    if (String(req.user[ownIdField]) === String(req.params[paramName])) return next();
    return res.status(403).json({ error: 'Not authorized for this resource' });
  };
}
