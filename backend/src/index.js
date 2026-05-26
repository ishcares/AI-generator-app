require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const fs      = require('fs');
const path    = require('path');

const { authMiddleware }             = require('./middleware/auth');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const authRoutes    = require('./routes/auth');
const appsRoutes    = require('./routes/apps');
const dynamicRoutes = require('./routes/dynamic');

const app  = express();
const PORT = process.env.PORT || 4000;

// ─────────────────────────────────────────────
// Security & Parsing Middleware
// ─────────────────────────────────────────────
app.use(helmet());

// Dynamic CORS configuration (Self-correcting for local/Vercel environments)
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (like curl, postman, server-to-server)
    if (!origin) return callback(null, true);
    
    // Whitelist localhost and Vercel domains
    const isVercel = origin.endsWith('.vercel.app');
    const isLocalhost = origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');
    const isCustomFrontend = process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL.replace(/\/$/, '');
    
    if (isVercel || isLocalhost || isCustomFrontend) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate Limiter for API endpoints (max 100 requests per 15 mins)
const rateLimit = require('express-rate-limit');
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes.',
    code: 'TOO_MANY_REQUESTS'
  }
});

// ─────────────────────────────────────────────
// Health Check (Excluded from Rate Limiting)
// ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// ─────────────────────────────────────────────
// Routes (Rate Limited)
// ─────────────────────────────────────────────
app.use('/api', apiLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/apps', authMiddleware, appsRoutes);
app.use('/api/apps', authMiddleware, dynamicRoutes);  // dynamic entity routes

// ─────────────────────────────────────────────
// 404 & Error Handlers (must be last)
// ─────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─────────────────────────────────────────────
// Run Migrations & Start Server
// ─────────────────────────────────────────────
async function runMigrations() {
  const { pool } = require('./db/pool');
  const migrationPath = path.join(__dirname, 'db', 'migrations.sql');
  try {
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    await pool.query(sql);
    console.log('[DB] Migrations applied successfully.');
  } catch (err) {
    console.error('[DB] Migration error:', err.message);
    // Don't crash — tables may already exist
  }
}

async function start() {
  await runMigrations();
  app.listen(PORT, () => {
    console.log(`\n🚀 AI App Generator Backend running on http://localhost:${PORT}`);
    console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Database    : ${process.env.DB_NAME || 'ai_app_generator'}`);
  });
}

start().catch((err) => {
  console.error('[FATAL] Server failed to start:', err);
  process.exit(1);
});

module.exports = app;
