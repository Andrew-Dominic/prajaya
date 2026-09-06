const nodemailer = require('nodemailer');

const port = Number(process.env.SMTP_PORT) || 465;
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: port,
  secure: port === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/['"]/g, '').trim() : '',
  },
  connectionTimeout: 6000,
  greetingTimeout: 6000,
  socketTimeout: 8000,
});

const sendEmail = async (to, subject, text, html) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('⚠️ SMTP credentials (SMTP_USER or SMTP_PASS) not configured in environment! Email not sent to:', to, '| Subject:', subject);
      return;
    }
    console.log(`Attempting to send email to ${to}...`);
    const info = await transporter.sendMail({
      from: `"Prajaya Foundation" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html
    });
    console.log(`Email sent successfully to ${to}, messageId: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`Email sending to ${to} failed:`, error.message);
  }
};

module.exports = {
  sendEmail,
};
