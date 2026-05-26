const express  = require('express');
const multer   = require('multer');
const { parse: parseCSV } = require('csv-parse/sync');
const { getAppById, getEntitySchema } = require('../services/schemaService');
const {
  listRecords,
  getRecord,
  createRecord,
  updateRecord,
  deleteRecord,
  bulkInsertRecords,
} = require('../services/recordService');
const { validateData } = require('../middleware/validate');

const router = express.Router();

// Multer config (in-memory CSV storage — max 5 MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are accepted.'));
    }
  },
});

// ─────────────────────────────────────────────────────────────
// Helper: resolve app + entity, gate by user ownership
// ─────────────────────────────────────────────────────────────
async function resolveAppEntity(req, res) {
  const { appId, entity } = req.params;

  const app = await getAppById(appId, req.user.id);
  if (!app) {
    res.status(404).json({
      success: false,
      error:   'App not found.',
      code:    'APP_NOT_FOUND',
    });
    return null;
  }

  const entitySchema = getEntitySchema(app.config, entity);
  if (!entitySchema) {
    res.status(404).json({
      success: false,
      error:   `Entity "${entity}" not found in app config.`,
      code:    'ENTITY_NOT_FOUND',
    });
    return null;
  }

  return { app, entitySchema };
}

// ─────────────────────────────────────────────────────────────
// GET /api/apps/:appId/:entity
// List all records for an entity
// ─────────────────────────────────────────────────────────────
router.get('/:appId/:entity', async (req, res, next) => {
  try {
    const resolved = await resolveAppEntity(req, res);
    if (!resolved) return;

    const limit  = Math.min(parseInt(req.query.limit  || '100', 10), 500);
    const offset = parseInt(req.query.offset || '0', 10);

    const { rows, total } = await listRecords(req.params.appId, req.params.entity, { limit, offset });

    return res.json({
      success: true,
      data: {
        records: rows,
        pagination: { total, limit, offset },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/apps/:appId/:entity
// Create a new record
// ─────────────────────────────────────────────────────────────
router.post('/:appId/:entity', async (req, res, next) => {
  try {
    const resolved = await resolveAppEntity(req, res);
    if (!resolved) return;

    const { entitySchema } = resolved;
    const data = req.body || {};

    const { valid, errors } = validateData(entitySchema.fields || [], data);
    if (!valid) {
      return res.status(422).json({
        success: false,
        error:   'Validation failed.',
        code:    'VALIDATION_ERROR',
        details: errors,
      });
    }

    const record = await createRecord(req.params.appId, req.params.entity, data);
    return res.status(201).json({ success: true, data: { record } });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/apps/:appId/:entity/:id
// Replace a record
// ─────────────────────────────────────────────────────────────
router.put('/:appId/:entity/:id', async (req, res, next) => {
  try {
    const resolved = await resolveAppEntity(req, res);
    if (!resolved) return;

    const { entitySchema } = resolved;
    const data = req.body || {};

    const { valid, errors } = validateData(entitySchema.fields || [], data);
    if (!valid) {
      return res.status(422).json({
        success: false,
        error:   'Validation failed.',
        code:    'VALIDATION_ERROR',
        details: errors,
      });
    }

    const record = await updateRecord(req.params.appId, req.params.entity, req.params.id, data);
    if (!record) {
      return res.status(404).json({
        success: false,
        error:   'Record not found.',
        code:    'RECORD_NOT_FOUND',
      });
    }

    return res.json({ success: true, data: { record } });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/apps/:appId/:entity/:id
// ─────────────────────────────────────────────────────────────
router.delete('/:appId/:entity/:id', async (req, res, next) => {
  try {
    const resolved = await resolveAppEntity(req, res);
    if (!resolved) return;

    const deleted = await deleteRecord(req.params.appId, req.params.entity, req.params.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error:   'Record not found.',
        code:    'RECORD_NOT_FOUND',
      });
    }

    return res.json({ success: true, data: { id: deleted.id } });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/apps/:appId/:entity/import
// CSV bulk import
// ─────────────────────────────────────────────────────────────
router.post('/:appId/:entity/import', upload.single('file'), async (req, res, next) => {
  try {
    const resolved = await resolveAppEntity(req, res);
    if (!resolved) return;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error:   'No CSV file uploaded. Use form-data field "file".',
        code:    'MISSING_FILE',
      });
    }

    const { entitySchema } = resolved;
    const fields = entitySchema.fields || [];

    // Parse CSV
    let csvRows;
    try {
      csvRows = parseCSV(req.file.buffer.toString('utf-8'), {
        columns:          true,   // use first row as headers
        skip_empty_lines: true,
        trim:             true,
      });
    } catch (parseErr) {
      return res.status(400).json({
        success: false,
        error:   `CSV parsing failed: ${parseErr.message}`,
        code:    'CSV_PARSE_ERROR',
      });
    }

    if (csvRows.length === 0) {
      return res.status(400).json({
        success: false,
        error:   'CSV file is empty.',
        code:    'EMPTY_CSV',
      });
    }

    // Validate & coerce each row
    const validRows   = [];
    const failedRows  = [];

    csvRows.forEach((rawRow, i) => {
      // Coerce types
      const data = {};
      for (const field of fields) {
        const raw = rawRow[field.name];
        if (raw === undefined || raw === '') {
          data[field.name] = undefined;
        } else if (field.type === 'number') {
          data[field.name] = isNaN(Number(raw)) ? raw : Number(raw);
        } else if (field.type === 'boolean') {
          data[field.name] = raw === 'true' || raw === '1' ? true : false;
        } else {
          data[field.name] = raw;
        }
      }

      const { valid, errors } = validateData(fields, data);
      if (valid) {
        validRows.push({ data, raw: rawRow });
      } else {
        failedRows.push({ rowIndex: i + 2, data: rawRow, errors }); // +2 for 1-index + header
      }
    });

    const { insertedCount, failed: dbFailed } = await bulkInsertRecords(
      req.params.appId,
      req.params.entity,
      validRows
    );

    return res.status(200).json({
      success: true,
      data: {
        total:     csvRows.length,
        inserted:  insertedCount,
        failed:    [...failedRows, ...dbFailed],
        failedCount: failedRows.length + dbFailed.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/apps/:appId/:entity/:id
// Get a single record
// ─────────────────────────────────────────────────────────────
router.get('/:appId/:entity/:id', async (req, res, next) => {
  try {
    const resolved = await resolveAppEntity(req, res);
    if (!resolved) return;

    const record = await getRecord(req.params.appId, req.params.entity, req.params.id);
    if (!record) {
      return res.status(404).json({
        success: false,
        error:   'Record not found.',
        code:    'RECORD_NOT_FOUND',
      });
    }

    return res.json({ success: true, data: { record } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
