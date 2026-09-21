import { db } from '@/lib/db';
import { success } from '@/lib/api/response';
import { getSystemSettings } from '@/lib/admin/settings';

export async function GET() {
  const settings = await getSystemSettings();
  return success({ maintenanceMode: settings.maintenanceMode });
}
