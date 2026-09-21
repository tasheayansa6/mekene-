import { churchConfig } from '@/config/church';
import { getAppUrl, getEmailBackend, getEmailFrom } from '@/lib/auth/config';

interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

async function sendEmail(message: EmailMessage): Promise<void> {
  const backend = getEmailBackend();
  if (backend === 'console' || process.env.NODE_ENV !== 'production') {
    console.info('\n========== GIVING EMAIL (development) ==========');
    console.info(`From: ${getEmailFrom()}`);
    console.info(`To: ${message.to}`);
    console.info(`Subject: ${message.subject}`);
    console.info(message.text);
    console.info('================================================\n');
    return;
  }
  console.info(`[email] SMTP backend is not configured. Message to ${message.to} was not sent.`);
}

export async function sendContributionReceiptEmail(options: {
  to: string;
  receiptNumber: string | null;
  reference: string;
  amount: string;
  currency: string;
  contributionType: string;
  campaignTitle?: string | null;
  isAnonymous: boolean;
}) {
  const name = churchConfig.branding.name;
  const receiptUrl = `${getAppUrl()}/give/receipt/${options.reference}`;
  const subject = `${name} contribution receipt`;
  const text = [
    `Thank you for your contribution to ${name}.`,
    ``,
    `Reference: ${options.reference}`,
    options.receiptNumber ? `Receipt: ${options.receiptNumber}` : null,
    `Amount: ${options.amount} ${options.currency}`,
    `Type: ${options.contributionType}`,
    options.campaignTitle ? `Campaign: ${options.campaignTitle}` : null,
    options.isAnonymous ? `Recorded as anonymous for public display.` : null,
    ``,
    `View receipt: ${receiptUrl}`,
    ``,
    `This message does not include card numbers or payment secrets.`,
  ]
    .filter(Boolean)
    .join('\n');

  await sendEmail({
    to: options.to,
    subject,
    text,
    html: `<p>${text.replace(/\n/g, '<br/>')}</p>`,
  });
}
