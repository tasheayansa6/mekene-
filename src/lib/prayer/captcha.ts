/**
 * Optional CAPTCHA. Credentials come from environment variables.
 * If no secret is configured, verification is skipped (development / low-abuse).
 */

export function captchaProvider(): string {
  return (process.env.PRAYER_CAPTCHA_PROVIDER || 'none').trim().toLowerCase();
}

export function captchaSiteKey(): string | null {
  return process.env.NEXT_PUBLIC_PRAYER_CAPTCHA_SITE_KEY?.trim() || null;
}

export function captchaSecret(): string | null {
  return process.env.PRAYER_CAPTCHA_SECRET?.trim() || null;
}

export function captchaRequired(): boolean {
  return Boolean(captchaSecret() && captchaProvider() !== 'none');
}

export async function verifyCaptchaToken(
  token: string | null | undefined,
  ip: string
): Promise<boolean> {
  if (!captchaRequired()) return true;
  if (!token || token.length < 8) return false;

  const provider = captchaProvider();
  const secret = captchaSecret();
  if (!secret) return true;

  try {
    if (provider === 'turnstile') {
      const body = new URLSearchParams({
        secret,
        response: token,
        remoteip: ip === 'unknown' ? '' : ip,
      });
      const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body,
      });
      const json = (await res.json()) as { success?: boolean };
      return json.success === true;
    }
    if (provider === 'recaptcha') {
      const body = new URLSearchParams({
        secret,
        response: token,
        remoteip: ip === 'unknown' ? '' : ip,
      });
      const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        body,
      });
      const json = (await res.json()) as { success?: boolean };
      return json.success === true;
    }
  } catch {
    return false;
  }

  return true;
}
