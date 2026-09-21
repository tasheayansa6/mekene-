import { getCorsAllowedOrigins } from './config';

export function resolveAllowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  const allowed = getCorsAllowedOrigins();
  if (allowed.includes(origin)) return origin;
  return null;
}

export function corsHeaders(request: Request): Record<string, string> {
  const origin = resolveAllowedOrigin(request.headers.get('origin'));
  const headers: Record<string, string> = {
    Vary: 'Origin',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, X-CSRF-Token, Authorization',
    'Access-Control-Max-Age': '600',
  };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

export function applyCors(response: Response, request: Request): Response {
  const headers = corsHeaders(request);
  const next = new Response(response.body, response);
  for (const [key, value] of Object.entries(headers)) {
    next.headers.set(key, value);
  }
  return next;
}
