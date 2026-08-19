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
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');

const config = require('./config');
const { globalLimiter, applicationLimiter, authLimiter, suggestionLimiter } = require('./middlewares/rateLimiter.middleware');
const { errorHandler, AppError } = require('./middlewares/error.middleware');
const { sendEmail } = require('./email');

// Initialize Express
const app = express();

// Security: Secure JWT Secret & Hash
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'prajaya123';
// Generate bcrypt hash of the password on server start to defeat timing attacks
const adminPasswordHash = bcrypt.hashSync(ADMIN_PASSWORD, 12);

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
    origin: (origin, callback) => callback(null, true), // Reflect origin dynamically
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
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
app.use(cookieParser());

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
app.post('/api/v1/applications', applicationLimiter, upload.fields([{ name: 'resume', maxCount: 1 }, { name: 'photo', maxCount: 1 }]), async (req, res) => {
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
      `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; padding: 40px 20px; margin: 0;">
         <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
            <div style="background-color: #1e293b; padding: 30px; text-align: center; border-bottom: 4px solid #c59d5f;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 1px;">PRAJAYA FOUNDATION</h1>
            </div>
            <div style="padding: 40px 30px;">
              <h2 style="color: #0f172a; margin-top: 0; margin-bottom: 20px; font-size: 20px;">Application Received</h2>
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Dear <strong style="color: #0f172a;">${name}</strong>,
              </p>
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                Thank you for your interest in volunteering with us. We have successfully received your application.
              </p>
              
              <div style="background-color: #f1f5f9; border-left: 4px solid #10b981; padding: 18px 20px; margin-bottom: 35px; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; color: #334155; font-size: 15px; line-height: 1.6;">
                  Your application will be reviewed by our administration team. You will receive another email notifying you of the final decision shortly.
                </p>
              </div>

              <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                Thank you for your dedication to serving the community!<br><br>Warm Regards,<br><strong>Prajaya Foundation Team</strong>
              </p>
            </div>
            <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 13px; margin: 0;">&copy; ${new Date().getFullYear()} Prajaya Foundation. All Rights Reserved.</p>
            </div>
         </div>
       </div>`
    );

    // Send notification email to admin
    const adminUrl = config.frontendUrl === 'http://localhost:3000' && process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}/admin` 
      : `${config.frontendUrl}/admin`;
      
    await sendEmail(
      process.env.ADMIN_EMAIL || 'admin@prajaya.org',
      'New Volunteer Application Received',
      `A new application has been received from ${name} (${email}).\n\nReview the application here: ${adminUrl}`,
      `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; padding: 40px 20px; margin: 0;">
         <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
            <div style="background-color: #1e293b; padding: 30px; text-align: center; border-bottom: 4px solid #c59d5f;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 1px;">PRAJAYA FOUNDATION</h1>
            </div>
            <div style="padding: 40px 30px;">
              <h2 style="color: #0f172a; margin-top: 0; margin-bottom: 20px; font-size: 20px;">New Volunteer Application</h2>
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                A new volunteer application has been submitted by <strong style="color: #0f172a;">${name}</strong> (<a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a>).
              </p>
              
              <div style="background-color: #f1f5f9; border-left: 4px solid #2563eb; padding: 18px 20px; margin-bottom: 35px; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; color: #334155; font-size: 15px; line-height: 1.8;">
                  <strong style="color: #0f172a;">Category:</strong> ${category || 'N/A'}<br>
                  <strong style="color: #0f172a;">City:</strong> ${current_city || 'N/A'}, ${state || 'N/A'}<br>
                  <strong style="color: #0f172a;">Status:</strong> ${current_status || 'N/A'}
                </p>
              </div>

              <div style="text-align: center;">
                <a href="${adminUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);">Review Application Dashboard &rarr;</a>
              </div>
            </div>
            <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 13px; margin: 0;">This is an automated security notification from the Prajaya Foundation backend.</p>
            </div>
         </div>
       </div>`
    );

    res.status(200).json({ success: true, message: 'Application received', data: data[0] });
  } catch (error) {
    console.error('Submission error:', error);
    res.status(500).json({ success: false, message: 'Server error processing application', error: error.message });
  }
});

// Secure Admin Auth Middleware via HttpOnly Cookies
const requireAuth = (req, res, next) => {
  const token = req.cookies.admin_session || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized access. Please log in.' });
  }
  try {
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
    const decision = status === 'approved' ? 'Selected' : 'Not Selected';
    await sendEmail(
      appData.email,
      `Update on Your Prajaya Foundation Application`,
      `Hello ${appData.name},\n\nYour application has been ${decision}.\nReason: ${reason}\n\nThank you,\nPrajaya Foundation`,
      `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; padding: 40px 20px; margin: 0;">
         <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
            <div style="background-color: #1e293b; padding: 30px; text-align: center; border-bottom: 4px solid #c59d5f;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 1px;">PRAJAYA FOUNDATION</h1>
            </div>
            <div style="padding: 40px 30px;">
              <h2 style="color: #0f172a; margin-top: 0; margin-bottom: 20px; font-size: 20px;">Application Status Update</h2>
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Dear <strong style="color: #0f172a;">${appData.name}</strong>,
              </p>
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                We have reviewed your volunteer application. We are writing to inform you that your application has been <strong style="color: ${status === 'approved' ? '#10b981' : '#ef4444'};">${status === 'approved' ? 'SELECTED' : 'NOT SELECTED'}</strong>.
              </p>
              
              <div style="background-color: #f1f5f9; border-left: 4px solid ${status === 'approved' ? '#10b981' : '#ef4444'}; padding: 18px 20px; margin-bottom: 35px; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; color: #334155; font-size: 15px; line-height: 1.8;">
                  <strong style="color: #0f172a;">Message from Admin:</strong><br>
                  ${reason}
                </p>
              </div>

              <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                Thank you for your interest in volunteering with the Prajaya Foundation. We deeply appreciate your desire to serve the community.
              </p>
            </div>
            <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 13px; margin: 0;">&copy; ${new Date().getFullYear()} Prajaya Foundation. All Rights Reserved.</p>
            </div>
         </div>
       </div>`
    );

    res.status(200).json({ success: true, data: appData });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete application
app.delete('/api/v1/applications/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    // Constant time comparison via bcrypt for critical action
    if (!password || !bcrypt.compareSync(password, adminPasswordHash)) {
      return res.status(401).json({ success: false, message: 'Invalid master password. Deletion aborted.' });
    }

    // Get the application to find file paths
    const { data: appData, error: fetchError } = await supabase
      .from('applications')
      .select('resume_path, photo_path')
      .eq('id', id)
      .single();

    if (fetchError) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    // Delete files from storage to save space
    if (appData.resume_path) {
      const pathPart = appData.resume_path.includes('http') 
        ? appData.resume_path.split('/uploads/')[1] 
        : appData.resume_path;
      if (pathPart) await supabase.storage.from('uploads').remove([pathPart]);
    }
    
    if (appData.photo_path) {
      const pathPart = appData.photo_path.includes('http') 
        ? appData.photo_path.split('/uploads/')[1] 
        : appData.photo_path;
      if (pathPart) await supabase.storage.from('uploads').remove([pathPart]);
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('applications')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    res.status(200).json({ success: true, message: 'Application and associated files deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, message: 'Server error during deletion' });
  }
});

// Submit a suggestion
app.post('/api/v1/suggestions', suggestionLimiter, async (req, res) => {
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
app.post('/api/v1/admin/login', authLimiter, (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ success: false, message: 'Password required' });

  // Constant time comparison via bcrypt
  const isValid = bcrypt.compareSync(password, adminPasswordHash);
  if (isValid) {
    const token = jwt.sign({ role: 'admin', timestamp: Date.now() }, JWT_SECRET, { expiresIn: '12h' });
    
    res.cookie('admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 12 * 60 * 60 * 1000 // 12 hours
    });
    
    res.status(200).json({ success: true, message: 'Authenticated successfully' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid secure password' });
  }
});

// Admin Logout
app.post('/api/v1/admin/logout', (req, res) => {
  res.clearCookie('admin_session');
  res.status(200).json({ success: true });
});

// Admin Session Check
app.get('/api/v1/admin/check', requireAuth, (req, res) => {
  res.status(200).json({ success: true });
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
