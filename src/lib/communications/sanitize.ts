const SENSITIVE_KEY = /password|secret|token|authorization|api[_-]?key|cookie|cvv|pan|card/i;
const HTML_TAG = /<\/?[a-zA-Z][^>]*>/g;

export function sanitizeRelatedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim().slice(0, 500);
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('blob:')
  ) {
    return null;
  }

  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function sanitizeNotificationData(
  data: Record<string, unknown> | null | undefined
): string | null {
  if (!data || typeof data !== 'object') return null;
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEY.test(key)) continue;
    if (typeof value === 'string') {
      clean[key] = value.replace(HTML_TAG, '').slice(0, 500);
    } else if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
      clean[key] = value;
    } else if (typeof value === 'object') {
      continue;
    }
  }
  try {
    return JSON.stringify(clean).slice(0, 4000);
  } catch {
    return null;
  }
}

export function parseJobPayload(payload: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(payload) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (SENSITIVE_KEY.test(key)) continue;
      clean[key] = value;
    }
    return clean;
  } catch {
    return {};
  }
}
