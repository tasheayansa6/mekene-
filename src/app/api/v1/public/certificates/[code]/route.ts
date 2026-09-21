import { notFound, success } from '@/lib/api/response';
import { verifyCertificateByCode } from '@/lib/education/certificates';

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;
  const cert = await verifyCertificateByCode(code);
  if (!cert) return notFound('Certificate not found');
  return success(cert);
}
