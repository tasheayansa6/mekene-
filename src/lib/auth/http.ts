import { error } from '@/lib/api/response';
import { validateCsrf } from '@/lib/auth/csrf';
import { attachCsrfCookie } from '@/lib/auth/csrf';
import type { NextResponse } from 'next/server';

export function rejectIfCsrfInvalid(request: Request) {
  const result = validateCsrf(request);
  if (!result.ok) {
    return error(
      'Request could not be verified. Please refresh the page and try again.',
      403
    );
  }
  return null;
}

export function withCsrfCookie<T>(
  response: NextResponse<T>,
  token?: string
): NextResponse<T> {
  attachCsrfCookie(response, token);
  return response;
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
