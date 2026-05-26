const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';

let poolConfig;

if (process.env.DATABASE_URL) {
  try {
    const rawUrl = process.env.DATABASE_URL;
    // Regex extracts user, password, host, port, database from postgresql://user:pass@host:port/db
    const match = rawUrl.match(/^postgresql:\/\/([^:]+):(.*)@([^:]+):(\d+)\/(.+)$/);
    
    if (match) {
      const [_, user, password, host, port, databaseAndQuery] = match;
      const database = databaseAndQuery.split('?')[0];
      
      poolConfig = {
        user: decodeURIComponent(user),
        password: decodeURIComponent(password),
        host,
        port: parseInt(port, 10),
        database,
        ssl: rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1')
          ? false
          : { rejectUnauthorized: false },
        max: parseInt(process.env.DB_POOL_MAX || '20', 10),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      };
    } else {
      poolConfig = {
        connectionString: process.env.DATABASE_URL,
        ssl: rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1')
          ? false
          : { rejectUnauthorized: false },
        max: parseInt(process.env.DB_POOL_MAX || '20', 10),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      };
    }
  } catch (err) {
    console.error('[DB] Custom URI parsing error:', err.message);
    poolConfig = {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    };
  }
} else {
  poolConfig = {
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME     || 'ai_app_generator',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max:      parseInt(process.env.DB_POOL_MAX || '20', 10),
    idleTimeoutMillis:    30000,
    connectionTimeoutMillis: 5000,
  };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

/**
 * Run a query with automatic error logging.
 * @param {string} text - SQL text
 * @param {Array}  params - Query parameters
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DB] query executed in ${duration}ms`);
    }
    return result;
  } catch (err) {
    console.error('[DB] Query error:', err.message, '| SQL:', text);
    throw err;
  }
}

/**
 * Get a dedicated client from the pool (for transactions).
 */
async function getClient() {
  return pool.connect();
}

module.exports = { pool, query, getClient };
