const HTML_TAG = /<\/?[a-zA-Z][^>]*>/g;
const UNSAFE_PROTOCOL = /\]\(\s*(javascript|data|vbscript):[^)]*\)/gi;
const BARE_UNSAFE = /\b(?:javascript|data|vbscript):[^\s)]+/gi;

export function sanitizeMarkdown(input: string, maxLength = 50_000): string {
  let value = input.replace(/\0/g, '').replace(HTML_TAG, '');
  value = value.replace(UNSAFE_PROTOCOL, '](#blocked-url)');
  value = value.replace(BARE_UNSAFE, '#blocked-url');
  if (value.length > maxLength) {
    value = value.slice(0, maxLength);
  }
  return value.trim();
}

export function sanitizePlainText(input: string, maxLength = 500): string {
  return input.replace(HTML_TAG, '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

export function isSafePublicUrl(url: string | null | undefined): boolean {
  if (!url) return true;
  const trimmed = url.trim();
  if (trimmed.startsWith('/uploads/')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}
