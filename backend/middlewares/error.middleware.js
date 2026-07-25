/**
 * Global Error Handler Middleware
 * 
 * This is the LAST middleware in the Express pipeline.
 * All errors — thrown or passed via next(err) — land here.
 * 
 * Responsibilities:
 * - Log the full error (for developers)
 * - Send a clean, safe response (for clients — never leak stack traces)
 * - Handle known vs unknown errors differently
 */

const config = require('../config');

// Custom application error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Distinguishes expected errors from bugs
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handling middleware
 * Express recognizes this as an error handler because it has 4 parameters.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Default values
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';

  // Log the error in development
  if (config.isDev) {
    console.error('ERROR:', {
      message: err.message,
      statusCode: err.statusCode,
      stack: err.stack,
      path: req.originalUrl,
      method: req.method,
    });
  } else {
    // In production, only log unexpected errors (not operational ones)
    if (!err.isOperational) {
      console.error('UNEXPECTED ERROR:', err);
    }
  }

  // Send response
  res.status(err.statusCode).json({
    success: false,
    message: err.isOperational ? err.message : 'Something went wrong',
    ...(config.isDev && { stack: err.stack }), // Stack trace only in dev
  });
};

module.exports = { AppError, errorHandler };
