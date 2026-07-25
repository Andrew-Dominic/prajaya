/**
 * Prajaya Foundation — Express Server
 * 
 * Entry point for the entire application.
 * 
 * Phase 1: Serves static frontend files only.
 * Future phases will add API routes, auth, uploads, etc.
 * 
 * Middleware order matters:
 * 1. Security (helmet, cors)
 * 2. Logging (morgan)
 * 3. Rate limiting
 * 4. Body parsing (for future API routes)
 * 5. Static file serving
 * 6. API routes (future)
 * 7. 404 handler
 * 8. Global error handler (must be last)
 */

// Ensure IPv4 is preferred for DNS resolution (fixes Supabase ENOTFOUND issues)
require('dns').setDefaultResultOrder('ipv4first');

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Pool } = require('pg');

const config = require('./config');
const { globalLimiter } = require('./middlewares/rateLimiter.middleware');
const { errorHandler, AppError } = require('./middlewares/error.middleware');

// Initialize Express
const app = express();

// Initialize Database Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Step 2: Connect PostgreSQL and test query
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('PostgreSQL Connection Error:', err);
  } else {
    console.log('PostgreSQL Connected Successfully at:', res.rows[0].now);
  }
});

// Ensure applications table exists
pool.query(`
  CREATE TABLE IF NOT EXISTS applications (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`).then(() => {
  // Add all other columns if they don't exist
  const alterTableQueries = `
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS category TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS age INTEGER;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS dob DATE;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS blood_group TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS alt_phone TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS alt_email TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS temp_address TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS perm_address TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS education TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS current_status TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS motivation TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS resume_path TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS photo_path TEXT;
  `;
  return pool.query(alterTableQueries);
}).catch(err => console.error("Error creating/altering table:", err));

// ──────────────────────────────────────────────
// 1. SECURITY MIDDLEWARE
// ──────────────────────────────────────────────

// Helmet sets security headers (CSP, X-Frame-Options, etc.)
// Custom CSP to allow Google Fonts, Font Awesome, GSAP, Lenis CDNs
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://unpkg.com",
          "https://cdnjs.cloudflare.com",
        ],
        "script-src-attr": ["'unsafe-inline'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://cdnjs.cloudflare.com",
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com",
        ],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
      },
    },
  })
);

// CORS — allow requests from the frontend URL
app.use(
  cors({
    origin: config.frontendUrl,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ──────────────────────────────────────────────
// 2. LOGGING
// ──────────────────────────────────────────────

// Morgan logs HTTP requests
// 'dev' format in development, 'combined' (Apache-style) in production
app.use(morgan(config.isDev ? 'dev' : 'combined'));

// ──────────────────────────────────────────────
// 3. RATE LIMITING
// ──────────────────────────────────────────────

app.use(globalLimiter);

// ──────────────────────────────────────────────
// 4. BODY PARSING (for future API routes)
// ──────────────────────────────────────────────

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ──────────────────────────────────────────────
// 5. STATIC FILE SERVING
// ──────────────────────────────────────────────

// Serve static frontend files
app.use(express.static(config.frontendPath));

// Serve uploaded files statically so admin can view them
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve the admin panel (future phase)
app.use('/admin', express.static(config.adminPath));

// ──────────────────────────────────────────────
// 6. API ROUTES (future phases)
// ──────────────────────────────────────────────

// API routes will be mounted here in Phase 3+
// app.use('/api/v1', require('./routes'));

// Set up Multer storage for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

app.post('/api/v1/applications', upload.fields([{ name: 'resume', maxCount: 1 }, { name: 'photo', maxCount: 1 }]), async (req, res) => {
  console.log('--- NEW APPLICATION RECEIVED ---');
  console.log('Body:', req.body);
  console.log('Files:', req.files);
  console.log('--------------------------------');
  
  try {
    const { 
      category, name, age, dob, blood_group, phone, alt_phone, 
      email, alt_email, temp_address, perm_address, 
      education, current_status, motivation 
    } = req.body;
    
    let resume_path = null;
    let photo_path = null;

    if (req.files && req.files['resume'] && req.files['resume'][0]) {
      resume_path = req.files['resume'][0].filename;
    }
    if (req.files && req.files['photo'] && req.files['photo'][0]) {
      photo_path = req.files['photo'][0].filename;
    }

    const query = `
      INSERT INTO applications (
        category, name, age, dob, blood_group, phone, alt_phone, 
        email, alt_email, temp_address, perm_address, 
        education, current_status, motivation, resume_path, photo_path
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
      RETURNING *
    `;
    const values = [
      category, name, age, dob, blood_group, phone, alt_phone, 
      email, alt_email, temp_address, perm_address, 
      education, current_status, motivation, resume_path, photo_path
    ];
    
    const result = await pool.query(query, values);
    console.log('Inserted into database:', result.rows[0].id);
    res.status(200).json({ success: true, message: 'Application received', data: result.rows[0] });
  } catch (error) {
    console.error('Database insertion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin Panel: Fetch all applications
app.get('/api/v1/applications', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM applications ORDER BY created_at DESC');
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Database fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ──────────────────────────────────────────────
// 7. HEALTH CHECK
// ──────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Prajaya Foundation API is running',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

// ──────────────────────────────────────────────
// 8. 404 HANDLER
// ──────────────────────────────────────────────

// Catch any route that doesn't match static files or API
app.use((req, res, next) => {
  // If requesting an API route, return JSON 404
  if (req.originalUrl.startsWith('/api')) {
    return next(new AppError('Route not found', 404));
  }

  // For non-API routes, serve the frontend index (SPA-style fallback)
  res.sendFile(path.join(config.frontendPath, 'index.html'));
});

// ──────────────────────────────────────────────
// 9. GLOBAL ERROR HANDLER (must be last)
// ──────────────────────────────────────────────

app.use(errorHandler);

// ──────────────────────────────────────────────
// START SERVER
// ──────────────────────────────────────────────

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(config.port, () => {
    console.log(`
    ╔══════════════════════════════════════════╗
    ║   PRAJAYA FOUNDATION SERVER             ║
    ║                                         ║
    ║   Environment : ${config.nodeEnv.padEnd(22)}║
    ║   Port        : ${String(config.port).padEnd(22)}║
    ║   Frontend    : http://localhost:${config.port}${' '.repeat(Math.max(0, 6 - String(config.port).length))}║
    ║   Admin       : http://localhost:${config.port}/admin${' '.repeat(Math.max(0, 0))}║
    ║   Health      : http://localhost:${config.port}/api/health║
    ╚══════════════════════════════════════════╝
    `);
  });
}

// Export for Vercel Serverless Function
module.exports = app;
