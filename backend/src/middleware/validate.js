/**
 * Validation middleware factory.
 * Validates incoming request body data against an entity schema.
 *
 * Usage:
 *   router.post('/', validateBody(schema), handler)
 *   or use validateAgainstEntity() for dynamic entity schemas.
 */

const VALID_FIELD_TYPES = ['string', 'email', 'number', 'boolean', 'date', 'text', 'url', 'phone'];

/**
 * Validate a single field value against its schema definition.
 * Returns null if valid, or an error message string if invalid.
 */
function validateField(fieldSchema, value) {
  const { name, type, required } = fieldSchema;

  // Handle missing / null values
  if (value === undefined || value === null || value === '') {
    if (required) return `Field "${name}" is required.`;
    return null; // optional field, skip further checks
  }

  switch (type) {
    case 'string':
    case 'text':
      if (typeof value !== 'string')
        return `Field "${name}" must be a string.`;
      break;

    case 'email':
      if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
        return `Field "${name}" must be a valid email address.`;
      break;

    case 'url':
      try {
        new URL(value);
      } catch {
        return `Field "${name}" must be a valid URL.`;
      }
      break;

    case 'phone':
      if (typeof value !== 'string' || !/^\+?[\d\s\-().]{7,20}$/.test(value))
        return `Field "${name}" must be a valid phone number.`;
      break;

    case 'number':
      if (typeof value !== 'number' && isNaN(Number(value)))
        return `Field "${name}" must be a number.`;
      break;

    case 'boolean':
      if (typeof value !== 'boolean' && value !== 'true' && value !== 'false')
        return `Field "${name}" must be a boolean.`;
      break;

    case 'date':
      if (isNaN(Date.parse(value)))
        return `Field "${name}" must be a valid date.`;
      break;

    default:
      // Unknown field type — log but don't crash
      console.warn(`[validate] Unknown field type "${type}" for field "${name}". Skipping validation.`);
  }

  return null;
}

/**
 * Validate data object against an array of field schema definitions.
 * Returns { valid: boolean, errors: string[] }
 */
function validateData(fields, data) {
  if (!Array.isArray(fields)) {
    return { valid: false, errors: ['Schema fields must be an array.'] };
  }

  const errors = [];

  for (const fieldSchema of fields) {
    if (!fieldSchema || typeof fieldSchema !== 'object') continue;
    const { name } = fieldSchema;
    if (!name) continue;

    const value = data[name];
    const error = validateField(fieldSchema, value);
    if (error) errors.push(error);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Express middleware: validates req.body against entity schema.
 * The entity schema (array of field definitions) must be passed in.
 */
function validateAgainstEntity(fields) {
  return (req, res, next) => {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        error:  'Request body must be a JSON object.',
        code:   'INVALID_REQUEST_BODY',
      });
    }

    const { valid, errors } = validateData(fields, req.body);
    if (!valid) {
      return res.status(422).json({
        success: false,
        error:   'Validation failed.',
        code:    'VALIDATION_ERROR',
        details: errors,
      });
    }

    next();
  };
}

/**
 * Validate a full app config object.
 * Returns { valid: boolean, errors: string[] }
 */
function validateAppConfig(config) {
  const errors = [];

  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['Config must be a JSON object.'] };
  }

  if (!config.app || typeof config.app !== 'string') {
    errors.push('Config must include an "app" name (string).');
  }

  if (!Array.isArray(config.entities)) {
    errors.push('Config must include an "entities" array.');
  } else {
    config.entities.forEach((entity, i) => {
      if (!entity || typeof entity !== 'object') {
        errors.push(`Entity at index ${i} must be an object.`);
        return;
      }
      if (!entity.name || typeof entity.name !== 'string') {
        errors.push(`Entity at index ${i} must have a "name" string.`);
      }
      if (!Array.isArray(entity.fields)) {
        errors.push(`Entity "${entity.name || i}" must have a "fields" array.`);
      } else {
        entity.fields.forEach((field, j) => {
          if (!field.name) {
            errors.push(`Field at index ${j} in entity "${entity.name}" must have a "name".`);
          }
          if (!field.type) {
            errors.push(`Field "${field.name || j}" in entity "${entity.name}" must have a "type".`);
          } else if (!VALID_FIELD_TYPES.includes(field.type)) {
            // Warn but allow unknown types (graceful degradation)
            console.warn(`[config] Unknown field type "${field.type}" — will be treated as string.`);
          }
        });
      }
    });
  }

  if (config.views !== undefined && !Array.isArray(config.views)) {
    errors.push('"views" must be an array if provided.');
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateData, validateField, validateAgainstEntity, validateAppConfig, VALID_FIELD_TYPES };
