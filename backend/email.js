const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmail = async (to, subject, text, html) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('⚠️ SMTP credentials not set. Email not sent to:', to, '| Subject:', subject);
      return;
    }
    await transporter.sendMail({
      from: `"Prajaya Foundation" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html
    });
    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error('Email sending failed:', error);
  }
};

module.exports = {
  sendEmail,
};
