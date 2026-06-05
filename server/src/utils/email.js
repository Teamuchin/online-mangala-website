const nodemailer = require('nodemailer');
const dns = require('dns').promises;

let transporter;

async function getTransporter() {
  if (transporter) return transporter;

  // If using Ethereal for local testing and no env vars are set
  if (!process.env.SMTP_HOST && process.env.NODE_ENV !== 'production') {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('Ethereal Email account created:', testAccount.user);
  } else {
    // Production / Configured SMTP
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

async function sendVerificationEmail(to, token) {
  const mailTransporter = await getTransporter();
  
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

  const info = await mailTransporter.sendMail({
    from: '"Online Mangala" <noreply@onlinemangala.com>',
    to,
    subject: 'Verify your email address',
    text: `Welcome to Online Mangala! Please verify your email by clicking the following link: ${verificationUrl}`,
    html: `<p>Welcome to Online Mangala!</p><p>Please verify your email by clicking the following link:</p><p><a href="${verificationUrl}">${verificationUrl}</a></p>`,
  });

  if (!process.env.SMTP_HOST && process.env.NODE_ENV !== 'production') {
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  }
  return info;
}

async function isValidEmailWithMX(email) {
  if (!email) return false;
  
  // Basic regex check first
  const regexValid = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email);
  if (!regexValid) return false;

  const domain = email.split('@')[1];
  try {
    const addresses = await dns.resolveMx(domain);
    return addresses && addresses.length > 0;
  } catch (error) {
    return false;
  }
}

module.exports = {
  sendVerificationEmail,
  isValidEmailWithMX,
};
