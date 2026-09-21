/**
 * Channel adapters — broadcast-level publishing for external providers.
 */

export type ChannelPublishResult =
  | { ok: true; providerReference: string | null; message: string }
  | { ok: false; errorCode: string; message: string };

export interface CommunicationChannelProvider {
  id: string;
  displayName: string;
  configured: boolean;
  publish(input: {
    title: string;
    message: string;
    url?: string | null;
    to?: string | null;
  }): Promise<ChannelPublishResult>;
}

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function buildBroadcastText(input: { title: string; message: string; url?: string | null }): string {
  return [input.title, input.message, input.url].filter(Boolean).join('\n\n');
}

export const inAppProvider: CommunicationChannelProvider = {
  id: 'in_app',
  displayName: 'In-app',
  configured: true,
  async publish() {
    return { ok: true, providerReference: null, message: 'In-app notification recorded.' };
  },
};

export const emailChannelProvider: CommunicationChannelProvider = {
  id: 'email',
  displayName: 'Email',
  configured: true,
  async publish() {
    return { ok: true, providerReference: null, message: 'Email queued via application mailer.' };
  },
};

/** Official Telegram Bot API — broadcast channel via TELEGRAM_CHAT_ID. */
export const telegramProvider: CommunicationChannelProvider = {
  id: 'telegram',
  displayName: 'Telegram',
  get configured() {
    return Boolean(env('TELEGRAM_BOT_TOKEN') && env('TELEGRAM_CHAT_ID'));
  },
  async publish(input) {
    const token = env('TELEGRAM_BOT_TOKEN');
    const chatId = env('TELEGRAM_CHAT_ID');
    if (!token || !chatId) {
      return {
        ok: false,
        errorCode: 'not_configured',
        message:
          'Telegram is not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID after reviewing the official Bot API docs.',
      };
    }

    const text = buildBroadcastText(input);
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          disable_web_page_preview: true,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        description?: string;
        result?: { message_id?: number };
      };

      if (!response.ok || !payload.ok) {
        return {
          ok: false,
          errorCode: 'telegram_api_error',
          message: payload.description || 'Telegram API request failed.',
        };
      }

      return {
        ok: true,
        providerReference:
          payload.result?.message_id != null ? String(payload.result.message_id) : null,
        message: 'Sent via Telegram Bot API.',
      };
    } catch (error) {
      return {
        ok: false,
        errorCode: 'network_error',
        message: error instanceof Error ? error.message.slice(0, 200) : 'Network error.',
      };
    }
  },
};

/** Generic SMS adapter — requires SMS_PROVIDER_API_KEY + SMS_FROM; optional SMS_PROVIDER_URL. */
export const smsProvider: CommunicationChannelProvider = {
  id: 'sms',
  displayName: 'SMS',
  get configured() {
    return Boolean(env('SMS_PROVIDER_API_KEY') && env('SMS_FROM'));
  },
  async publish(input) {
    if (!this.configured) {
      return {
        ok: false,
        errorCode: 'not_configured',
        message: 'SMS is not configured. Set SMS_PROVIDER_API_KEY and SMS_FROM.',
      };
    }

    const url = env('SMS_PROVIDER_URL');
    if (!url) {
      console.info('[communications:sms] adapter_pending — credentials present, URL missing', {
        title: input.title,
        to: input.to ? '[redacted]' : undefined,
      });
      return {
        ok: false,
        errorCode: 'adapter_pending',
        message: 'SMS credentials are present, but SMS_PROVIDER_URL is not configured.',
      };
    }

    const apiKey = env('SMS_PROVIDER_API_KEY');
    const from = env('SMS_FROM');
    const body = buildBroadcastText(input);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from,
          to: input.to ?? undefined,
          body,
        }),
      });

      if (!response.ok) {
        const detail = (await response.text()).slice(0, 200);
        return {
          ok: false,
          errorCode: 'sms_api_error',
          message: detail || `SMS provider returned HTTP ${response.status}.`,
        };
      }

      let providerReference: string | null = null;
      try {
        const payload = (await response.json()) as { id?: string; messageId?: string };
        providerReference = payload.id ?? payload.messageId ?? null;
      } catch {
        providerReference = null;
      }

      return {
        ok: true,
        providerReference,
        message: 'Sent via SMS provider.',
      };
    } catch (error) {
      return {
        ok: false,
        errorCode: 'network_error',
        message: error instanceof Error ? error.message.slice(0, 200) : 'Network error.',
      };
    }
  },
};

/** Future official social APIs only — no scraping or unofficial automation. */
export const socialProvider: CommunicationChannelProvider = {
  id: 'social',
  displayName: 'Social (future)',
  configured: false,
  async publish() {
    return {
      ok: false,
      errorCode: 'not_configured',
      message: 'Social publishing uses official platform APIs only and is not enabled yet.',
    };
  },
};

const ALL_PROVIDERS: CommunicationChannelProvider[] = [
  inAppProvider,
  emailChannelProvider,
  telegramProvider,
  smsProvider,
  socialProvider,
];

export function getChannelProvider(channel: string): CommunicationChannelProvider {
  switch (channel) {
    case 'telegram':
      return telegramProvider;
    case 'sms':
      return smsProvider;
    case 'social':
      return socialProvider;
    case 'email':
      return emailChannelProvider;
    default:
      return inAppProvider;
  }
}

export function listConfiguredChannels(): Array<{ id: string; displayName: string }> {
  return ALL_PROVIDERS.filter((provider) => provider.configured).map((provider) => ({
    id: provider.id,
    displayName: provider.displayName,
  }));
}
