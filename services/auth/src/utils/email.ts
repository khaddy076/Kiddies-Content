import nodemailer from 'nodemailer';
import { config } from '../config.js';

const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  secure: config.SMTP_PORT === 465,
  auth:
    config.SMTP_USER
      ? { user: config.SMTP_USER, pass: config.SMTP_PASS }
      : undefined,
});

async function send(to: string, subject: string, html: string): Promise<void> {
  if (config.NODE_ENV === 'development' && !config.SMTP_USER) {
    console.log(`[Email] To: ${to} | Subject: ${subject}`);
    return;
  }
  await transporter.sendMail({ from: config.EMAIL_FROM, to, subject, html });
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  token: string,
): Promise<void> {
  const link = `${config.WEB_URL}/verify-email?token=${token}`;
  await send(
    to,
    'Verify your Kiddies Content account',
    `<h2>Welcome, ${name}!</h2>
     <p>Please verify your email address by clicking the link below:</p>
     <a href="${link}" style="background:#6C63FF;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Verify Email</a>
     <p>This link expires in 24 hours.</p>
     <p>If you did not create this account, please ignore this email.</p>`,
  );
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string,
): Promise<void> {
  const link = `${config.WEB_URL}/reset-password?token=${token}`;
  await send(
    to,
    'Reset your Kiddies Content password',
    `<h2>Hi ${name},</h2>
     <p>You requested a password reset. Click below to set a new password:</p>
     <a href="${link}" style="background:#6C63FF;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Reset Password</a>
     <p>This link expires in 1 hour.</p>
     <p>If you didn't request this, you can safely ignore this email.</p>`,
  );
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  await send(
    to,
    'Welcome to Kiddies Content!',
    `<h2>Welcome to Kiddies Content, ${name}!</h2>
     <p>You can now create accounts for your children and start curating their content experience.</p>
     <p>Get started by:</p>
     <ul>
       <li>Adding your child's profile</li>
       <li>Setting screen time limits</li>
       <li>Approving content from YouTube</li>
     </ul>
     <a href="${config.WEB_URL}/dashboard" style="background:#6C63FF;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Go to Dashboard</a>`,
  );
}

export async function sendContentRequestNotification(
  to: string,
  parentName: string,
  childName: string,
  contentTitle: string,
  requestId: string,
): Promise<void> {
  const approveLink = `${config.WEB_URL}/requests?action=approve&id=${requestId}`;
  const denyLink = `${config.WEB_URL}/requests?action=deny&id=${requestId}`;
  await send(
    to,
    `${childName} wants to watch something`,
    `<h2>Hi ${parentName},</h2>
     <p><strong>${childName}</strong> has requested to watch:</p>
     <blockquote style="border-left:4px solid #6C63FF;padding-left:12px;margin:16px 0;">
       ${contentTitle}
     </blockquote>
     <div style="display:flex;gap:12px;margin-top:24px;">
       <a href="${approveLink}" style="background:#10B981;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">✓ Approve</a>
       <a href="${denyLink}" style="background:#EF4444;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">✗ Deny</a>
     </div>
     <p style="margin-top:16px;">Or manage all requests in your <a href="${config.WEB_URL}/requests">dashboard</a>.</p>`,
  );
}
