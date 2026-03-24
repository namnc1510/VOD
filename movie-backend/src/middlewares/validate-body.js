const { errorResponse } = require('../utils/api-response');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateBody(schema) {
  return (req, res, next) => {
    const input = req.body && typeof req.body === 'object' ? { ...req.body } : {};
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = input[field];
      const isMissing = value === undefined || value === null || value === '';

      if (rules.required && isMissing) {
        errors.push({ field, message: 'is required' });
        continue;
      }

      if (isMissing) {
        continue;
      }

      if (rules.type === 'string' && typeof value !== 'string') {
        errors.push({ field, message: 'must be a string' });
        continue;
      }

      if (rules.type === 'number') {
        if (typeof value !== 'number' || Number.isNaN(value)) {
          errors.push({ field, message: 'must be a number' });
          continue;
        }

        if (rules.min !== undefined && value < rules.min) {
          errors.push({ field, message: `must be greater than or equal to ${rules.min}` });
        }

        if (rules.max !== undefined && value > rules.max) {
          errors.push({ field, message: `must be less than or equal to ${rules.max}` });
        }
      }

      if (rules.type === 'boolean') {
        if (typeof value !== 'boolean') {
          errors.push({ field, message: 'must be a boolean' });
          continue;
        }
      }

      if (rules.type === 'array') {
        if (!Array.isArray(value)) {
          errors.push({ field, message: 'must be an array' });
          continue;
        }

        if (rules.minItems !== undefined && value.length < rules.minItems) {
          errors.push({ field, message: `must contain at least ${rules.minItems} items` });
        }

        if (rules.maxItems !== undefined && value.length > rules.maxItems) {
          errors.push({ field, message: `must not exceed ${rules.maxItems} items` });
        }

        if (rules.elementType === 'string') {
          const normalized = [];
          for (const item of value) {
            if (typeof item !== 'string') {
              errors.push({ field, message: 'must contain only strings' });
              break;
            }
            normalized.push(item.trim());
          }
          input[field] = normalized;
        }
      }

      if (rules.type === 'string') {
        const trimmed = value.trim();

        if (rules.minLength && trimmed.length < rules.minLength) {
          errors.push({ field, message: `must contain at least ${rules.minLength} characters` });
        }

        if (rules.maxLength && trimmed.length > rules.maxLength) {
          errors.push({ field, message: `must not exceed ${rules.maxLength} characters` });
        }

        if (rules.format === 'email' && !EMAIL_PATTERN.test(trimmed)) {
          errors.push({ field, message: 'must be a valid email address' });
        }

        input[field] = trimmed;
      }

      if (rules.enum && Array.isArray(rules.enum) && !rules.enum.includes(input[field])) {
        errors.push({ field, message: `must be one of: ${rules.enum.join(', ')}` });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json(
        errorResponse('Validation failed', {
          requestId: req.id,
          issues: errors
        })
      );
    }

    req.body = input;
    return next();
  };
}

module.exports = validateBody;
