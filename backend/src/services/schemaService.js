const { query } = require('../db/pool');

/**
 * Schema Service
 * Handles app creation, config retrieval, and entity schema lookups.
 */

/**
 * Create a new app with the given config.
 */
async function createApp(userId, name, config) {
  const result = await query(
    `INSERT INTO apps (user_id, name, config)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, name, config, created_at, updated_at`,
    [userId, name, JSON.stringify(config)]
  );
  return result.rows[0];
}

/**
 * Get all apps belonging to a user.
 */
async function getAppsByUser(userId) {
  const result = await query(
    `SELECT id, name, config, created_at, updated_at
     FROM apps
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Get a single app by id, ensuring it belongs to the user.
 */
async function getAppById(appId, userId) {
  const result = await query(
    `SELECT id, user_id, name, config, created_at, updated_at
     FROM apps
     WHERE id = $1 AND user_id = $2`,
    [appId, userId]
  );
  return result.rows[0] || null;
}

/**
 * Update an app's config.
 */
async function updateApp(appId, userId, name, config) {
  const result = await query(
    `UPDATE apps
     SET name = $1, config = $2
     WHERE id = $3 AND user_id = $4
     RETURNING id, name, config, updated_at`,
    [name, JSON.stringify(config), appId, userId]
  );
  return result.rows[0] || null;
}

/**
 * Delete an app (cascades to records).
 */
async function deleteApp(appId, userId) {
  const result = await query(
    `DELETE FROM apps WHERE id = $1 AND user_id = $2 RETURNING id`,
    [appId, userId]
  );
  return result.rows[0] || null;
}

/**
 * Extract entity schema (field definitions) from an app config.
 * Returns null if entity is not found.
 */
function getEntitySchema(config, entityName) {
  if (!config || !Array.isArray(config.entities)) return null;
  const entity = config.entities.find(
    (e) => e.name && e.name.toLowerCase() === entityName.toLowerCase()
  );
  return entity || null;
}

module.exports = {
  createApp,
  getAppsByUser,
  getAppById,
  updateApp,
  deleteApp,
  getEntitySchema,
};
