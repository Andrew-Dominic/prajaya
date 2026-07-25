/**
 * Rate Limiter Middleware
 * 
 * Configures rate limiting per endpoint type.
 * Uses in-memory store — perfect for single-server deployment.
 * 
 * For multi-server: swap to redis store via express-rate-limit's
 * rate-limit-redis adapter. No other code changes needed.
 */

const rateLimit = require('express-rate-limit');

// Global rate limiter — applies to all requests
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // 100 requests per window per IP
  standardHeaders: true,     // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,      // Disable X-RateLimit-* headers
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});

// Strict limiter for application submissions
const applicationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,                    // 5 submissions per hour per IP
  message: {
    success: false,
    message: 'Too many applications submitted. Please try again later.',
  },
});

// Auth limiter — prevents brute force login
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 login attempts per window per IP
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.',
  },
});

// Suggestion limiter
const suggestionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,                   // 10 suggestions per hour per IP
  message: {
    success: false,
    message: 'Too many submissions. Please try again later.',
  },
});

module.exports = {
  globalLimiter,
  applicationLimiter,
  authLimiter,
  suggestionLimiter,
};
