const nodemailer = require('nodemailer');

/**
 * Creates a fresh Nodemailer transporter on each call.
 * CRITICAL for Vercel/serverless: reusing a single transporter keeps
 * a TCP socket open which gets torn down by the function lifecycle —
 * always create a new transport per invocation.
 */
function createTransporter() {
  const port = Number(process.env.SMTP_PORT) || 465;
  const host = process.env.SMTP_HOST || 'smtp.hostinger.com';

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,           // true for 465 (SSL), false for 587 (STARTTLS)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
        ? process.env.SMTP_PASS.replace(/^["']|["']$/g, '').trim()
        : '',
    },
    tls: {
      rejectUnauthorized: true,     // enforce valid cert in production
      minVersion: 'TLSv1.2',
    },
    // Generous timeouts — serverless cold-starts can add extra latency
    connectionTimeout: 15000,       // 15 s to open TCP + TLS
    greetingTimeout:  10000,        // 10 s for SMTP EHLO greeting
    socketTimeout:    20000,        // 20 s per socket operation
    pool: false,                    // no connection pool in serverless
    maxConnections: 1,
  });
}

/**
 * Send an email with up to 2 attempts (1 retry on failure).
 * Returns the nodemailer info object on success, or throws on total failure.
 */
const sendEmail = async (to, subject, text, html) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn(
      '⚠️  SMTP credentials not set in environment. Email NOT sent.',
      '| to:', to, '| subject:', subject
    );
    return;
  }

  const MAX_ATTEMPTS = 2;
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const transporter = createTransporter();
    try {
      console.log(`[Email] Attempt ${attempt}/${MAX_ATTEMPTS} → ${to} | "${subject}"`);

      const info = await transporter.sendMail({
        from: `"Prajaya Foundation" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html,
      });

      console.log(`[Email] ✅ Sent to ${to} | messageId: ${info.messageId}`);
      return info;

    } catch (err) {
      lastError = err;
      console.error(
        `[Email] ❌ Attempt ${attempt} failed for ${to}:`,
        err.code || err.message,
        err.response || ''
      );

      if (attempt < MAX_ATTEMPTS) {
        // Brief pause before retry so the SMTP server can recover
        await new Promise(r => setTimeout(r, 2000));
      }
    } finally {
      // Always close the transport to release the socket cleanly
      try { transporter.close(); } catch (_) {}
    }
  }

  // All attempts failed — throw so the caller can decide how to handle it
  throw lastError;
};

module.exports = { sendEmail };
