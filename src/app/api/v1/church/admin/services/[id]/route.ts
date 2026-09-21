import { db } from '@/lib/db';
import { success, notFound, validationError } from '@/lib/api/response';
import { checkAdminAuth } from '../../../_lib/auth';
import { auditChurchChange } from '../../../_lib/audit';
import {
  serviceScheduleUpdateSchema,
  formatZodErrors,
} from '../../../_lib/validation';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const auth = await checkAdminAuth(request, 'update');
  if (!auth.ok) return auth.error;

  const { id } = await context.params;

  const existing = await db.serviceSchedule.findUnique({ where: { id } });
  if (!existing) {
    return notFound('Service schedule');
  }

  const body = await request.json();
  const parsed = serviceScheduleUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(formatZodErrors(parsed.error));
  }

  const updated = await db.serviceSchedule.update({
    where: { id },
    data: parsed.data,
  });

  await auditChurchChange(request, auth.user.id, 'update', 'service_schedule', id, {
    serviceName: updated.serviceName,
  });

  return success(updated, 'Service schedule updated');
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await checkAdminAuth(request, 'delete');
  if (!auth.ok) return auth.error;

  const { id } = await context.params;

  const existing = await db.serviceSchedule.findUnique({ where: { id } });
  if (!existing) {
    return notFound('Service schedule');
  }

  await db.serviceSchedule.update({
    where: { id },
    data: { isActive: false },
  });

  await auditChurchChange(request, auth.user.id, 'delete', 'service_schedule', id);

  return success({ id }, 'Service schedule deleted');
}
