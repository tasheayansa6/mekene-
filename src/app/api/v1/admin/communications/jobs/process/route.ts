import { forbidden, success } from '@/lib/api/response';
import { guardAdminWrite, enforceAdminRateLimit } from '@/lib/admin/guard';
import {
  canManageIntegrations,
  canSendCommunications,
} from '@/lib/communications/access';
import { processCommunicationJobs } from '@/lib/communications/service';

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'communications', 'assign');
  if (!auth.ok) return auth.error;
  if (!canSendCommunications(auth.user) && !canManageIntegrations(auth.user)) {
    return forbidden();
  }

  const rate = enforceAdminRateLimit(request, auth.user.id, 'communications-process');
  if (rate) return rate;

  const result = await processCommunicationJobs(10);
  return success(result, `Processed ${result.processed} of ${result.scanned} jobs.`);
}
