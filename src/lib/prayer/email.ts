import { churchConfig } from '@/config/church';
import { getEmailBackend, getEmailFrom } from '@/lib/auth/config';

/**
 * Confirmation only — never includes prayer request content.
 * Sent only when the church setting prayer_email_confirmation is enabled.
 */
export async function sendPrayerReceivedEmail(options: {
  to: string;
  firstName?: string | null;
}): Promise<void> {
  const name = churchConfig.branding.name;
  const greeting = options.firstName?.trim() || 'Friend';
  const subject = `We received your prayer request — ${name}`;
  const text = `${name}\n\nHi ${greeting},\n\nYour prayer request has been received.\nThank you for allowing us to pray with you.\n\nThis message does not repeat your request. If you did not submit a prayer request, you can ignore this email.`;

  const backend = getEmailBackend();
  if (backend === 'console' || process.env.NODE_ENV !== 'production') {
    console.info('\n========== PRAYER EMAIL (development) ==========');
    console.info(`From: ${getEmailFrom()}`);
    console.info(`To: ${options.to}`);
    console.info(`Subject: ${subject}`);
    console.info(text);
    console.info('==============================================\n');
    return;
  }

  console.info(`[email] SMTP backend is not configured. Prayer confirmation to ${options.to} was not sent.`);
}
