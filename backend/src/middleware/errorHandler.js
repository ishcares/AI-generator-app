/**
 * Global error handler middleware.
 * Must be registered LAST in Express middleware chain.
 */

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Log the error internally
  console.error('[ErrorHandler]', err.message || err);

  // PostgreSQL-specific errors
  if (err.code) {
    switch (err.code) {
      case '23505': // unique_violation
        return res.status(409).json({
          success: false,
          error:   'A record with that value already exists.',
          code:    'DUPLICATE_ENTRY',
        });
      case '23503': // foreign_key_violation
        return res.status(400).json({
          success: false,
          error:   'Referenced record does not exist.',
          code:    'FOREIGN_KEY_VIOLATION',
        });
      case '22P02': // invalid_text_representation
        return res.status(400).json({
          success: false,
          error:   'Invalid ID format provided.',
          code:    'INVALID_ID_FORMAT',
        });
      case '42P01': // undefined_table
        return res.status(500).json({
          success: false,
          error:   'Database schema error. Please run migrations.',
          code:    'SCHEMA_ERROR',
        });
      default:
        break;
    }
  }

  // JWT errors (should be caught in middleware, but just in case)
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error:   'Invalid authentication token.',
      code:    'AUTH_TOKEN_INVALID',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error:   'Token has expired. Please log in again.',
      code:    'AUTH_TOKEN_EXPIRED',
    });
  }

  // Multer errors
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      error:   `File upload error: ${err.message}`,
      code:    'FILE_UPLOAD_ERROR',
    });
  }

  // Syntax errors (malformed JSON body)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error:   'Request body contains invalid JSON.',
      code:    'MALFORMED_JSON',
    });
  }

  // Generic fallback
  const statusCode = err.status || err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'An internal server error occurred.'
      : err.message || 'Unknown error';

  return res.status(statusCode).json({
    success: false,
    error:   message,
    code:    err.code || 'INTERNAL_ERROR',
  });
}

/**
 * 404 handler — placed before errorHandler.
 */
function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    error:   `Route ${req.method} ${req.path} not found.`,
    code:    'ROUTE_NOT_FOUND',
  });
}

module.exports = { errorHandler, notFoundHandler };
