import { forbidden, success } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { canViewEducation } from '@/lib/education/access';
import { getEducationReportSummary } from '@/lib/education/reports';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'education', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewEducation(auth.user)) return forbidden();

  const summary = await getEducationReportSummary();
  return success(summary);
}
