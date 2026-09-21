import { churchConfig } from '@/config/church';
import { getAppUrl, getEmailBackend, getEmailFrom } from '@/lib/auth/config';

export type NotificationEmailTemplate =
  | 'event_reminder'
  | 'membership_update'
  | 'giving_receipt'
  | 'announcement'
  | 'general';

interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

async function sendEmail(message: EmailMessage): Promise<void> {
  const backend = getEmailBackend();
  if (backend === 'console' || process.env.NODE_ENV !== 'production') {
    console.info('\n========== COMMUNICATIONS EMAIL (development) ==========');
    console.info(`From: ${getEmailFrom()}`);
    console.info(`To: ${message.to}`);
    console.info(`Subject: ${message.subject}`);
    console.info(message.text);
    console.info('=======================================================\n');
    return;
  }
  console.info(`[email] SMTP backend is not configured. Message to ${message.to} was not sent.`);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendTemplatedNotificationEmail(options: {
  to: string;
  template: NotificationEmailTemplate;
  title: string;
  message: string;
  ctaUrl?: string | null;
}) {
  const name = churchConfig.branding.name;
  const appUrl = getAppUrl();
  const cta =
    options.ctaUrl && options.ctaUrl.startsWith('/')
      ? `${appUrl}${options.ctaUrl}`
      : options.ctaUrl || null;

  const subjectPrefix =
    options.template === 'event_reminder'
      ? 'Event reminder'
      : options.template === 'membership_update'
        ? 'Membership update'
        : options.template === 'giving_receipt'
          ? 'Giving notice'
          : options.template === 'announcement'
            ? 'Announcement'
            : 'Notice';

  const subject = `${name}: ${subjectPrefix} — ${options.title}`.slice(0, 180);
  const text = [
    name,
    '',
    options.title,
    '',
    options.message,
    cta ? `\nOpen: ${cta}` : null,
    '',
    `This message was sent by ${name}. It does not include passwords or payment secrets.`,
  ]
    .filter(Boolean)
    .join('\n');

  const html = `
    <div style="font-family: Georgia, serif; color: #1a1a1a; max-width: 560px;">
      <p style="font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase; color: #5c5c5c;">${escapeHtml(name)}</p>
      <h1 style="font-size: 22px; margin: 8px 0 12px;">${escapeHtml(options.title)}</h1>
      <p style="line-height: 1.55;">${escapeHtml(options.message)}</p>
      ${cta ? `<p style="margin-top: 20px;"><a href="${escapeHtml(cta)}">Open in church portal</a></p>` : ''}
      <p style="margin-top: 28px; font-size: 12px; color: #6b6b6b;">This message does not include passwords or payment secrets.</p>
    </div>
  `;

  await sendEmail({ to: options.to, subject, text, html });
}
