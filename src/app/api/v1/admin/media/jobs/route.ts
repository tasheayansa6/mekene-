import { success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { enqueueMediaJob, listMediaJobs, processMediaJobs } from '@/lib/library/jobs';
import { z } from 'zod';
import { formatZodErrors } from '@/lib/auth/validation';

const createSchema = z.object({
  action: z.enum(['create', 'process']).optional(),
  type: z.string().min(1).optional(),
  targetKind: z.string().min(1).optional(),
  targetId: z.string().optional().nullable(),
  payload: z.record(z.string(), z.unknown()).optional(),
  idempotencyKey: z.string().optional().nullable(),
  limit: z.number().int().min(1).max(50).optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']).optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(50).optional(),
});

async function guardMediaRead(request: Request) {
  let auth = await guardAdminRead(request, 'media', 'view');
  if (!auth.ok) auth = await guardAdminRead(request, 'sermons', 'view');
  return auth;
}

async function guardMediaWrite(request: Request) {
  let auth = await guardAdminWrite(request, 'media', 'update');
  if (!auth.ok) auth = await guardAdminWrite(request, 'sermons', 'update');
  return auth;
}

export async function GET(request: Request) {
  const auth = await guardMediaRead(request);
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const status = url.searchParams.get('status') as
    | 'pending'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | null;
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') || 20)));

  const data = await listMediaJobs({
    status: status || undefined,
    page,
    pageSize,
  });
  return success(data);
}

export async function POST(request: Request) {
  const auth = await guardMediaWrite(request);
  if (!auth.ok) return auth.error;

  const parsed = createSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  if (parsed.data.action === 'process') {
    const result = await processMediaJobs(parsed.data.limit || 10);
    return success(result, 'Jobs processed.');
  }

  if (!parsed.data.type || !parsed.data.targetKind) {
    return validationError({
      type: ['type is required when creating a job.'],
      targetKind: ['targetKind is required when creating a job.'],
    });
  }

  const result = await enqueueMediaJob({
    type: parsed.data.type,
    targetKind: parsed.data.targetKind,
    targetId: parsed.data.targetId,
    payload: parsed.data.payload,
    idempotencyKey: parsed.data.idempotencyKey,
    createdById: auth.user.id,
  });

  return success(
    {
      job: {
        id: result.job.id,
        type: result.job.type,
        status: result.job.status,
        idempotencyKey: result.job.idempotencyKey,
      },
      created: result.created,
    },
    result.created ? 'Job queued.' : 'Existing job returned.',
    result.created ? 201 : 200
  );
}
