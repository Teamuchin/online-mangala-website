const { Resend } = require('resend');
const dns = require('dns').promises;

let resend;

function getResendClient() {
  if (resend) return resend;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey && process.env.NODE_ENV === 'production') {
    console.error('CRITICAL: RESEND_API_KEY is missing in production!');
  }

  resend = new Resend(apiKey);
  return resend;
}

async function sendVerificationEmail(to, token) {
  const client = getResendClient();
  
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

  const info = await client.emails.send({
    from: 'onboarding@resend.dev',
    to,
    subject: 'Verify your email address',
    text: `Welcome to Online Mangala! Please verify your email by clicking the following link: ${verificationUrl}`,
    html: `<p>Welcome to Online Mangala!</p><p>Please verify your email by clicking the following link:</p><p><a href="${verificationUrl}">${verificationUrl}</a></p>`,
  });

  if (info.error) {
    console.error('Resend Error:', info.error);
    throw new Error(info.error.message);
  }

  return info.data;
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

async function sendPasswordResetEmail(to, token) {
  const client = getResendClient();
  
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

  const info = await client.emails.send({
    from: 'onboarding@resend.dev',
    to,
    subject: 'Reset your password',
    text: `You requested a password reset. Please click the following link to reset your password: ${resetUrl}`,
    html: `<p>You requested a password reset.</p><p>Please click the following link to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });

  if (info.error) {
    console.error('Resend Error:', info.error);
    throw new Error(info.error.message);
  }

  return info.data;
}

module.exports = {
  sendVerificationEmail,
  isValidEmailWithMX,
  sendPasswordResetEmail,
};
