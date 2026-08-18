/**
 * PRAJAYA Foundation — Express Server
 * 
 * Entry point for the entire application.
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const config = require('./config');
const { globalLimiter } = require('./middlewares/rateLimiter.middleware');
const { errorHandler, AppError } = require('./middlewares/error.middleware');
const { sendEmail } = require('./email');

// Initialize Express
const app = express();

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || 'https://bnmgzrskfwuuhlnxavan.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Supabase Client Initialized for DB and Storage');
} else {
  console.warn('⚠️ SUPABASE_KEY is missing from .env!');
}

// ──────────────────────────────────────────────
// 1. SECURITY MIDDLEWARE
// ──────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdnjs.cloudflare.com"],
        "script-src-attr": ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
        imgSrc: ["'self'", "data:", "blob:", "https://bnmgzrskfwuuhlnxavan.supabase.co"],
        connectSrc: ["'self'"],
      },
    },
  })
);

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
app.use(morgan(config.isDev ? 'dev' : 'combined'));

// ──────────────────────────────────────────────
// 3. RATE LIMITING
// ──────────────────────────────────────────────
app.use(globalLimiter);

// ──────────────────────────────────────────────
// 4. BODY PARSING
// ──────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ──────────────────────────────────────────────
// 5. STATIC FILE SERVING
// ──────────────────────────────────────────────
app.use(express.static(config.frontendPath));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/admin', express.static(config.adminPath));

// ──────────────────────────────────────────────
// 6. API ROUTES
// ──────────────────────────────────────────────
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

async function uploadToSupabase(file, folder) {
  if (!supabase) throw new Error('Supabase client not initialized. Check SUPABASE_KEY.');
  
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const cleanName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
  const filePath = `${folder}/${uniqueSuffix}-${cleanName}`;
  
  const { data, error } = await supabase
    .storage
    .from('uploads')
    .upload(filePath, file.buffer, { contentType: file.mimetype, upsert: false });
    
  if (error) throw error;
  
  const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(filePath);
  return publicUrlData.publicUrl;
}

// Submit volunteer application
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

    if (req.files && req.files['resume'] && req.files['resume'][0]) {
      resume_path = await uploadToSupabase(req.files['resume'][0], 'resumes');
    }
    if (req.files && req.files['photo'] && req.files['photo'][0]) {
      photo_path = await uploadToSupabase(req.files['photo'][0], 'photos');
    }

    const { data, error } = await supabase
      .from('applications')
      .insert([{
        category, name, age: age || null, dob: dob || null, blood_group, phone, alt_phone, 
        email, alt_email, hometown, current_city, state, temp_address, perm_address, 
        current_status, education_level, degree, interest, hobbies, languages, motivation, experience, 
        resume_path, photo_path, status: 'pending'
      }])
      .select();

    if (error) throw error;

    console.log('Inserted into database:', data[0].id);
    
    // Send email to applicant
    await sendEmail(
      email,
      'Application Received - Prajaya Foundation',
      `Hello ${name},\n\nYour application has been successfully submitted. Results will be sent shortly.\n\nThank you,\nPrajaya Foundation`,
      `<p>Hello <strong>${name}</strong>,</p><p>Your application has been successfully submitted. Results will be sent shortly.</p><p>Thank you,<br>Prajaya Foundation</p>`
    );

    // Send notification email to admin
    await sendEmail(
      process.env.ADMIN_EMAIL || 'admin@prajaya.org',
      'New Volunteer Application Received',
      `A new application has been received from ${name} (${email}). Please check the admin panel.`,
      `<p>A new application has been received from <strong>${name}</strong> (${email}). Please log in to the admin panel to review it.</p>`
    );

    res.status(200).json({ success: true, message: 'Application received', data: data[0] });
  } catch (error) {
    console.error('Submission error:', error);
    res.status(500).json({ success: false, message: 'Server error processing application', error: error.message });
  }
});

// Admin Auth Middleware
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized access. Please log in.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'prajaya_super_secure_secret_key_2026';
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session. Please log in again.' });
  }
};

// Fetch all applications
app.get('/api/v1/applications', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Database fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update application status
app.patch('/api/v1/applications/:id/status', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const { data, error } = await supabase
      .from('applications')
      .update({ status, admin_reason: reason })
      .eq('id', id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const appData = data[0];
    
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
    
    const { data, error } = await supabase
      .from('suggestions')
      .insert([{ name, email, suggestion }])
      .select();

    if (error) throw error;

    await sendEmail(
      process.env.ADMIN_EMAIL || 'admin@prajaya.org',
      'New Suggestion Received - Prajaya Foundation',
      `New suggestion from ${name} (${email}):\n\n${suggestion}`,
      `<p>New suggestion from <strong>${name}</strong> (${email}):</p><p>${suggestion}</p>`
    );

    res.status(200).json({ success: true, message: 'Suggestion received', data: data[0] });
  } catch (error) {
    console.error('Suggestion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Fetch suggestions
app.get('/api/v1/suggestions', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('suggestions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json({ success: true, data });
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
    const JWT_SECRET = process.env.JWT_SECRET || 'prajaya_super_secure_secret_key_2026';
    const token = jwt.sign({ role: 'admin', timestamp: Date.now() }, JWT_SECRET, { expiresIn: '12h' });
    res.status(200).json({ success: true, token });
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
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return next(new AppError('Route not found', 404));
  }
  res.sendFile(path.join(config.frontendPath, 'index.html'));
});

// ──────────────────────────────────────────────
// 9. GLOBAL ERROR HANDLER
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

module.exports = app;
