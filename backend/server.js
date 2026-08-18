/**
 * PRAJAYA Foundation — Express Server
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

// require('dns').setDefaultResultOrder('ipv4first');

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
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS hometown TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS current_city TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS state TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS temp_address TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS perm_address TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS education TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS education_level TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS degree TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS current_status TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS interest TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS hobbies TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS languages TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS motivation TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS experience TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS resume_path TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS photo_path TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS admin_reason TEXT;
    
    CREATE TABLE IF NOT EXISTS suggestions (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      suggestion TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  return pool.query(alterTableQueries);
}).catch(err => console.error("Error creating/altering table:", err));

const { sendEmail } = require('./email');

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

// Import Supabase
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Client (if keys exist)
const supabaseUrl = process.env.SUPABASE_URL || 'https://bnmgzrskfwuuhlnxavan.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Supabase Storage Client Initialized');
} else {
  console.warn('⚠️ SUPABASE_KEY is missing from .env! File uploads to S3 bucket will fail.');
}

// Set up Multer using Memory Storage for direct cloud upload
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Helper function to upload to Supabase
async function uploadToSupabase(file, folder) {
  if (!supabase) throw new Error('Supabase client not initialized. Check SUPABASE_KEY.');
  
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  // Clean filename: remove spaces, special chars
  const cleanName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
  const filePath = `${folder}/${uniqueSuffix}-${cleanName}`;
  
  const { data, error } = await supabase
    .storage
    .from('uploads') // Bucket name must be 'uploads'
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });
    
  if (error) throw error;
  
  // Get public URL
  const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(filePath);
  return publicUrlData.publicUrl;
}

app.post('/api/v1/applications', upload.fields([{ name: 'resume', maxCount: 1 }, { name: 'photo', maxCount: 1 }]), async (req, res) => {
  console.log('--- NEW APPLICATION RECEIVED ---');
  
  try {
    const { 
      category, name, age, dob, blood_group, phone, alt_phone, 
      email, alt_email, hometown, current_city, state, temp_address, perm_address, 
      current_status, education_level, degree, interest, hobbies, languages, motivation, experience
    } = req.body;
    
    let resume_path = null;
    let photo_path = null;

    // Upload files to Supabase Storage if present
    if (req.files && req.files['resume'] && req.files['resume'][0]) {
      resume_path = await uploadToSupabase(req.files['resume'][0], 'resumes');
    }
    if (req.files && req.files['photo'] && req.files['photo'][0]) {
      photo_path = await uploadToSupabase(req.files['photo'][0], 'photos');
    }

    const query = `
      INSERT INTO applications (
        category, name, age, dob, blood_group, phone, alt_phone, 
        email, alt_email, hometown, current_city, state, temp_address, perm_address, 
        current_status, education_level, degree, interest, hobbies, languages, motivation, experience, resume_path, photo_path
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24) 
      RETURNING *
    `;
    const values = [
      category, name, age || null, dob || null, blood_group, phone, alt_phone, 
      email, alt_email, hometown, current_city, state, temp_address, perm_address, 
      current_status, education_level, degree, interest, hobbies, languages, motivation, experience, resume_path, photo_path
    ];
    
    const result = await pool.query(query, values);
    console.log('Inserted into database:', result.rows[0].id);
    
    // Send email to applicant
    await sendEmail(
      email,
      'Application Received - Prajaya Foundation',
      `Hello ${name},\n\nYour application has been successfully submitted. Results will be sent shortly.\n\nThank you,\nPrajaya Foundation`,
      `<p>Hello <strong>${name}</strong>,</p><p>Your application has been successfully submitted. Results will be sent shortly.</p><p>Thank you,<br>Prajaya Foundation</p>`
    );

    // Send notification email to admin
    await sendEmail(
      process.env.ADMIN_EMAIL || 'admin@prajaya.org', // Configure ADMIN_EMAIL in .env
      'New Volunteer Application Received',
      `A new application has been received from ${name} (${email}). Please check the admin panel.`,
      `<p>A new application has been received from <strong>${name}</strong> (${email}). Please log in to the admin panel to review it.</p>`
    );

    res.status(200).json({ success: true, message: 'Application received', data: result.rows[0] });
  } catch (error) {
    console.error('Submission error:', error);
    res.status(500).json({ success: false, message: 'Server error processing application', error: error.message });
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

// Update application status
app.patch('/api/v1/applications/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const result = await pool.query(
      'UPDATE applications SET status = $1, admin_reason = $2 WHERE id = $3 RETURNING *',
      [status, reason, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const appData = result.rows[0];
    
    // Send email to applicant about decision
    const decision = status === 'approved' ? 'Approved' : 'Disapproved';
    await sendEmail(
      appData.email,
      `Update on Your Prajaya Foundation Application`,
      `Hello ${appData.name},\n\nYour application has been ${decision}.\nReason: ${reason}\n\nThank you,\nPrajaya Foundation`,
      `<p>Hello <strong>${appData.name}</strong>,</p><p>Your application has been <strong>${decision}</strong>.</p><p><strong>Reason:</strong> ${reason}</p><p>Thank you,<br>Prajaya Foundation</p>`
    );

    res.status(200).json({ success: true, data: appData });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Submit a suggestion
app.post('/api/v1/suggestions', async (req, res) => {
  try {
    const { name, email, suggestion } = req.body;
    
    const result = await pool.query(
      'INSERT INTO suggestions (name, email, suggestion) VALUES ($1, $2, $3) RETURNING *',
      [name, email, suggestion]
    );

    // Send email notification to admin about suggestion
    await sendEmail(
      process.env.ADMIN_EMAIL || 'admin@prajaya.org',
      'New Suggestion Received - Prajaya Foundation',
      `New suggestion from ${name} (${email}):\n\n${suggestion}`,
      `<p>New suggestion from <strong>${name}</strong> (${email}):</p><p>${suggestion}</p>`
    );

    res.status(200).json({ success: true, message: 'Suggestion received', data: result.rows[0] });
  } catch (error) {
    console.error('Suggestion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin Panel: Fetch suggestions
app.get('/api/v1/suggestions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM suggestions ORDER BY created_at DESC');
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Database fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin Login
app.post('/api/v1/admin/login', (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || 'prajaya123';
  if (password === adminPassword) {
    res.status(200).json({ success: true, token: 'admin_token_mock' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid password' });
  }
});

// ──────────────────────────────────────────────
// 7. HEALTH CHECK
// ──────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'PRAJAYA Foundation API is running',
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
