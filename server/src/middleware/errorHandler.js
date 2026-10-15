import { AppError } from '../lib/AppError.js';

const DUPLICATE_MESSAGES = {
  name: ['DUPLICATE_ROLE_NAME', 'A role with this name already exists'],
  email: ['DUPLICATE_EMAIL', 'A user with this email already exists'],
};

export function notFound(req, res) {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Route not found: ${req.method} ${req.originalUrl}` } });
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ success: false, error: { code: err.code, message: err.message } });
  }

  if (err.code === 11000) {
    const key = Object.keys(err.keyPattern ?? {})[0];
    const [code, message] = DUPLICATE_MESSAGES[key] ?? ['DUPLICATE', 'Duplicate value'];
    return res.status(409).json({ success: false, error: { code, message } });
  }

  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors ?? {})[0]?.message ?? 'Validation failed';
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message } });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Request body is not valid JSON' } });
  }

  console.error(err);
  return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
}
