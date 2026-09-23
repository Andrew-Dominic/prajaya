/**
 * Central Configuration Module
 * 
 * Single source of truth for all environment variables.
 * Every module reads config from here — never directly from process.env.
 * 
 * This makes it trivial to:
 * - See all config in one place
 * - Add defaults
 * - Validate required variables
 * - Swap values for testing
 */

const path = require('path');
const fs   = require('fs');

// Load the correct .env file based on NODE_ENV
// Priority: .env.{NODE_ENV} → .env
const envFile = process.env.NODE_ENV === 'production'
  ? path.resolve(__dirname, '../../.env.production')
  : path.resolve(__dirname, '../../.env');

if (fs.existsSync(envFile)) {
  require('dotenv').config({ path: envFile });
} else {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
}


const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Paths
  frontendPath: path.resolve(__dirname, '../../frontend'),
  adminPath: path.resolve(__dirname, '../../admin'),

  // Helpers
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  isProd: process.env.NODE_ENV === 'production',
};

module.exports = config;
