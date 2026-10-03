const jwt = require('jsonwebtoken');
const { HttpError } = require('../config/helpers');

// Verifies the JWT sent as "Authorization: Bearer <token>"
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new HttpError(401, 'Please log in first.'));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, role: payload.role, name: payload.name };
    next();
  } catch (err) {
    next(new HttpError(401, 'Session expired or invalid. Please log in again.'));
  }
}

// Allows only the listed roles, e.g. requireRole('admin')
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new HttpError(403, 'You do not have permission to do that.'));
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
