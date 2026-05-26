const jwt = require('jsonwebtoken');

const JWT_SECRET  = process.env.JWT_SECRET  || 'change_me_in_production';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

/**
 * Authentication middleware — validates Bearer JWT token.
 * Attaches { id, email } to req.user on success.
 */
function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required.',
        code:  'AUTH_TOKEN_MISSING',
      });
    }

    const token = authHeader.slice(7);

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      const code = err.name === 'TokenExpiredError'
        ? 'AUTH_TOKEN_EXPIRED'
        : 'AUTH_TOKEN_INVALID';
      return res.status(401).json({
        success: false,
        error: err.name === 'TokenExpiredError'
          ? 'Token has expired. Please log in again.'
          : 'Invalid authentication token.',
        code,
      });
    }

    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Sign a JWT token for a user.
 */
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

module.exports = { authMiddleware, signToken };
