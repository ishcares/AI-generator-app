const express  = require('express');
const bcrypt   = require('bcryptjs');
const { query } = require('../db/pool');
const { signToken } = require('../middleware/auth');

const router = express.Router();

// ──────────────────────────────────────────────
// POST /api/auth/register
// ──────────────────────────────────────────────
router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        error:   'A valid email address is required.',
        code:    'MISSING_EMAIL',
      });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        error:   'Password must be at least 8 characters.',
        code:    'WEAK_PASSWORD',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error:   'Please provide a valid email address.',
        code:    'INVALID_EMAIL',
      });
    }

    // Check if user already exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error:   'An account with this email already exists.',
        code:    'EMAIL_TAKEN',
      });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, created_at`,
      [email.toLowerCase(), password_hash]
    );

    const user  = result.rows[0];
    const token = signToken({ id: user.id, email: user.email });

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: { id: user.id, email: user.email, createdAt: user.created_at },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────
// POST /api/auth/login
// ──────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error:   'Email and password are required.',
        code:    'MISSING_CREDENTIALS',
      });
    }

    const result = await query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error:   'Invalid email or password.',
        code:    'INVALID_CREDENTIALS',
      });
    }

    const user  = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({
        success: false,
        error:   'Invalid email or password.',
        code:    'INVALID_CREDENTIALS',
      });
    }

    const token = signToken({ id: user.id, email: user.email });

    return res.status(200).json({
      success: true,
      data: {
        token,
        user: { id: user.id, email: user.email },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────
// GET /api/auth/me  (protected)
// ──────────────────────────────────────────────
router.get('/me', require('../middleware/auth').authMiddleware, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, email, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error:   'User not found.',
        code:    'USER_NOT_FOUND',
      });
    }
    return res.json({ success: true, data: { user: result.rows[0] } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
