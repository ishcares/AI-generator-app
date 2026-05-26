const { query, getClient } = require('../db/pool');

/**
 * Record Service
 * Handles CRUD operations for entity records stored as JSONB.
 */

/**
 * List all records for a given app + entity, with optional pagination.
 */
async function listRecords(appId, entityName, { limit = 100, offset = 0 } = {}) {
  const result = await query(
    `SELECT id, data, created_at, updated_at
     FROM records
     WHERE app_id = $1 AND entity_name = $2
     ORDER BY created_at DESC
     LIMIT $3 OFFSET $4`,
    [appId, entityName, limit, offset]
  );
  const countResult = await query(
    `SELECT COUNT(*) as total FROM records WHERE app_id = $1 AND entity_name = $2`,
    [appId, entityName]
  );
  return {
    rows:  result.rows,
    total: parseInt(countResult.rows[0].total, 10),
  };
}

/**
 * Get a single record by id, ensuring it belongs to the app.
 */
async function getRecord(appId, entityName, recordId) {
  const result = await query(
    `SELECT id, data, created_at, updated_at
     FROM records
     WHERE id = $1 AND app_id = $2 AND entity_name = $3`,
    [recordId, appId, entityName]
  );
  return result.rows[0] || null;
}

/**
 * Create a new record.
 */
async function createRecord(appId, entityName, data) {
  const result = await query(
    `INSERT INTO records (app_id, entity_name, data)
     VALUES ($1, $2, $3)
     RETURNING id, data, created_at, updated_at`,
    [appId, entityName, JSON.stringify(data)]
  );
  return result.rows[0];
}

/**
 * Update an existing record's data (full replace).
 */
async function updateRecord(appId, entityName, recordId, data) {
  const result = await query(
    `UPDATE records
     SET data = $1
     WHERE id = $2 AND app_id = $3 AND entity_name = $4
     RETURNING id, data, created_at, updated_at`,
    [JSON.stringify(data), recordId, appId, entityName]
  );
  return result.rows[0] || null;
}

/**
 * Patch an existing record (merge data).
 */
async function patchRecord(appId, entityName, recordId, patch) {
  const result = await query(
    `UPDATE records
     SET data = data || $1::jsonb
     WHERE id = $2 AND app_id = $3 AND entity_name = $4
     RETURNING id, data, created_at, updated_at`,
    [JSON.stringify(patch), recordId, appId, entityName]
  );
  return result.rows[0] || null;
}

/**
 * Delete a record.
 */
async function deleteRecord(appId, entityName, recordId) {
  const result = await query(
    `DELETE FROM records
     WHERE id = $1 AND app_id = $2 AND entity_name = $3
     RETURNING id`,
    [recordId, appId, entityName]
  );
  return result.rows[0] || null;
}

/**
 * Bulk insert records (for CSV import).
 * Uses a transaction so partial failures don't corrupt DB.
 * Returns { inserted: number, failed: Array<{row, error}> }
 */
async function bulkInsertRecords(appId, entityName, rows) {
  const client = await getClient();
  const inserted = [];
  const failed   = [];

  try {
    await client.query('BEGIN');

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const result = await client.query(
          `INSERT INTO records (app_id, entity_name, data)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [appId, entityName, JSON.stringify(row.data)]
        );
        inserted.push(result.rows[0].id);
      } catch (err) {
        failed.push({
          rowIndex: i + 1,
          data:     row.raw,
          error:    err.message,
        });
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return { insertedCount: inserted.length, failed };
}

/**
 * Count records per entity (for dashboard widgets).
 */
async function countByEntity(appId) {
  const result = await query(
    `SELECT entity_name, COUNT(*) as count
     FROM records
     WHERE app_id = $1
     GROUP BY entity_name`,
    [appId]
  );
  return result.rows.reduce((acc, row) => {
    acc[row.entity_name] = parseInt(row.count, 10);
    return acc;
  }, {});
}

module.exports = {
  listRecords,
  getRecord,
  createRecord,
  updateRecord,
  patchRecord,
  deleteRecord,
  bulkInsertRecords,
  countByEntity,
};
