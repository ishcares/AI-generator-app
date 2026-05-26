const express = require('express');
const { validateAppConfig } = require('../middleware/validate');
const {
  createApp,
  getAppsByUser,
  getAppById,
  updateApp,
  deleteApp,
} = require('../services/schemaService');
const { countByEntity } = require('../services/recordService');

const router = express.Router();

// All routes here are protected by authMiddleware (mounted in index.js)

// ──────────────────────────────────────────────
// POST /api/apps  — register a new app config
// ──────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { config } = req.body || {};

    if (!config) {
      return res.status(400).json({
        success: false,
        error:   'A "config" object is required.',
        code:    'MISSING_CONFIG',
      });
    }

    const { valid, errors } = validateAppConfig(config);
    if (!valid) {
      return res.status(422).json({
        success: false,
        error:   'Invalid app configuration.',
        code:    'INVALID_CONFIG',
        details: errors,
      });
    }

    const app = await createApp(req.user.id, config.app, config);

    return res.status(201).json({ success: true, data: { app } });
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────
// GET /api/apps  — list all user's apps
// ──────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const apps = await getAppsByUser(req.user.id);
    return res.json({ success: true, data: { apps } });
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────
// GET /api/apps/:appId  — get single app
// ──────────────────────────────────────────────
router.get('/:appId', async (req, res, next) => {
  try {
    const app = await getAppById(req.params.appId, req.user.id);
    if (!app) {
      return res.status(404).json({
        success: false,
        error:   'App not found.',
        code:    'APP_NOT_FOUND',
      });
    }
    return res.json({ success: true, data: { app } });
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────
// PUT /api/apps/:appId  — update app config
// ──────────────────────────────────────────────
router.put('/:appId', async (req, res, next) => {
  try {
    const { config } = req.body || {};

    if (!config) {
      return res.status(400).json({
        success: false,
        error:   'A "config" object is required.',
        code:    'MISSING_CONFIG',
      });
    }

    const { valid, errors } = validateAppConfig(config);
    if (!valid) {
      return res.status(422).json({
        success: false,
        error:   'Invalid app configuration.',
        code:    'INVALID_CONFIG',
        details: errors,
      });
    }

    const app = await updateApp(req.params.appId, req.user.id, config.app, config);
    if (!app) {
      return res.status(404).json({
        success: false,
        error:   'App not found.',
        code:    'APP_NOT_FOUND',
      });
    }

    return res.json({ success: true, data: { app } });
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────
// DELETE /api/apps/:appId
// ──────────────────────────────────────────────
router.delete('/:appId', async (req, res, next) => {
  try {
    const deleted = await deleteApp(req.params.appId, req.user.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error:   'App not found.',
        code:    'APP_NOT_FOUND',
      });
    }
    return res.json({ success: true, data: { id: deleted.id } });
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────
// GET /api/apps/:appId/stats  — dashboard entity counts
// ──────────────────────────────────────────────
router.get('/:appId/stats', async (req, res, next) => {
  try {
    const app = await getAppById(req.params.appId, req.user.id);
    if (!app) {
      return res.status(404).json({
        success: false,
        error:   'App not found.',
        code:    'APP_NOT_FOUND',
      });
    }
    const counts = await countByEntity(req.params.appId);
    return res.json({ success: true, data: { counts } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
