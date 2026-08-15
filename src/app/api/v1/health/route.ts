/**
 * Health Check Endpoint
 * GET /api/v1/health/
 */

import { success } from '@/lib/api/response';

export async function GET() {
  return success(
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      service: 'Busa Mekenene Eyasus Church API',
    },
    'Busa Mekenene Eyasus API is running'
  );
}