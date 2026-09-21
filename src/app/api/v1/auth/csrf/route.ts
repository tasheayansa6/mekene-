import { success } from '@/lib/api/response';
import { createCsrfToken } from '@/lib/auth/csrf';
import { withCsrfCookie } from '@/lib/auth/http';

export async function GET() {
  const token = createCsrfToken();
  const response = success({ csrfToken: token });
  return withCsrfCookie(response, token);
}
