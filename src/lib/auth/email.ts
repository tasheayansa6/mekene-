import { churchConfig } from '@/config/church';
import { getAppUrl, getEmailBackend, getEmailFrom } from './config';

interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

async function sendEmail(message: EmailMessage): Promise<void> {
  const backend = getEmailBackend();
  if (backend === 'console' || process.env.NODE_ENV !== 'production') {
    console.info('\n========== AUTH EMAIL (development) ==========');
    console.info(`From: ${getEmailFrom()}`);
    console.info(`To: ${message.to}`);
    console.info(`Subject: ${message.subject}`);
    console.info(message.text);
    console.info('==============================================\n');
    return;
  }

  console.info(
    `[email] SMTP backend is not configured. Message to ${message.to} was not sent.`
  );
}

function layout(title: string, bodyHtml: string): string {
  const name = churchConfig.branding.name;
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f7f3ee;font-family:Georgia,serif;color:#3b2a2a;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3ee;padding:32px 16px;">
      <tr>
        <td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #ead9c4;">
            <tr>
              <td>
                <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#b08d4f;">${name}</p>
                <h1 style="margin:0 0 16px;font-size:22px;color:#6b2b2b;">${title}</h1>
                ${bodyHtml}
                <p style="margin:32px 0 0;font-size:12px;color:#7a6a5a;">This message was sent by ${name}. If you did not request it, you can ignore this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendVerificationEmail(options: {
  to: string;
  firstName: string;
  token: string;
}): Promise<void> {
  const url = `${getAppUrl()}/verify-email?token=${encodeURIComponent(options.token)}`;
  const subject = `Welcome to ${churchConfig.branding.name}`;
  const text = `Welcome to ${churchConfig.branding.name}\n\nHi ${options.firstName},\n\nPlease verify your email address by opening this link:\n${url}\n\nThis link expires in 24 hours and can be used once.`;
  const html = layout(
    'Welcome — please verify your email',
    `<p>Hi ${escapeHtml(options.firstName)},</p>
     <p>Please verify your email address to activate your account.</p>
     <p><a href="${url}" style="display:inline-block;background:#6b2b2b;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;">Verify email address</a></p>
     <p style="font-size:13px;color:#7a6a5a;">Or paste this link into your browser:<br>${escapeHtml(url)}</p>`
  );
  await sendEmail({ to: options.to, subject, text, html });
}

export async function sendPasswordResetEmail(options: {
  to: string;
  firstName: string;
  token: string;
}): Promise<void> {
  const url = `${getAppUrl()}/reset-password/${encodeURIComponent(options.token)}`;
  const subject = 'Password Reset Request';
  const text = `Password Reset Request\n\nHi ${options.firstName},\n\nA password reset was requested for your account.\nOpen this link to choose a new password:\n${url}\n\nThis link expires in 1 hour and can be used once. If you did not request a reset, you can ignore this email.`;
  const html = layout(
    'Password reset request',
    `<p>Hi ${escapeHtml(options.firstName)},</p>
     <p>A password reset was requested for your account.</p>
     <p><a href="${url}" style="display:inline-block;background:#6b2b2b;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;">Reset password</a></p>
     <p style="font-size:13px;color:#7a6a5a;">This link expires in 1 hour and can be used once.</p>`
  );
  await sendEmail({ to: options.to, subject, text, html });
}

export async function sendPasswordChangedEmail(options: {
  to: string;
  firstName: string;
}): Promise<void> {
  const subject = 'Your password was changed';
  const text = `Hi ${options.firstName},\n\nYour ${churchConfig.branding.name} account password was changed. If you did not make this change, please contact the church office immediately.`;
  const html = layout(
    'Your password was changed',
    `<p>Hi ${escapeHtml(options.firstName)},</p>
     <p>Your account password was changed. If you did not make this change, please contact the church office immediately.</p>`
  );
  await sendEmail({ to: options.to, subject, text, html });
}

export async function sendEmailChangeVerification(options: {
  to: string;
  firstName: string;
  token: string;
}): Promise<void> {
  const url = `${getAppUrl()}/verify-email?token=${encodeURIComponent(options.token)}&intent=email-change`;
  const subject = 'Confirm your new email address';
  const text = `Hi ${options.firstName},\n\nPlease confirm your new email address:\n${url}`;
  const html = layout(
    'Confirm your new email address',
    `<p>Hi ${escapeHtml(options.firstName)},</p>
     <p>Please confirm this new email address for your church account.</p>
     <p><a href="${url}" style="display:inline-block;background:#6b2b2b;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;">Confirm email</a></p>`
  );
  await sendEmail({ to: options.to, subject, text, html });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
