import { db } from '@/lib/db';
import { forbidden, notFound, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { sanitizePlainText } from '@/lib/content/sanitize';
import { canUpdateStaff, canViewStaff } from '@/lib/volunteers/access';
import { serializeStaff, staffListInclude } from '@/lib/volunteers/serialize';
import { formatZodErrors, staffUpdateSchema } from '@/lib/volunteers/validation';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminRead(request, 'staff', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewStaff(auth.user)) return forbidden();

  const { id } = await context.params;
  const row = await db.staffProfile.findUnique({
    where: { id },
    include: {
      ...staffListInclude,
      statusHistory: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          changedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });
  if (!row) return notFound('Staff profile');

  return success({
    ...serializeStaff(row),
    statusHistory: row.statusHistory.map((h) => ({
      id: h.id,
      oldStatus: h.oldStatus,
      newStatus: h.newStatus,
      reason: h.reason,
      changedById: h.changedById,
      createdAt: h.createdAt.toISOString(),
      changedBy: h.changedBy
        ? {
            id: h.changedBy.id,
            name: `${h.changedBy.firstName} ${h.changedBy.lastName}`.trim(),
          }
        : null,
    })),
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'staff', 'update');
  if (!auth.ok) return auth.error;
  if (!canUpdateStaff(auth.user)) return forbidden();

  const parsed = staffUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { id } = await context.params;
  const existing = await db.staffProfile.findUnique({ where: { id } });
  if (!existing) return notFound('Staff profile');

  const data = parsed.data;
  const startDate =
    data.startDate === undefined
      ? undefined
      : data.startDate
        ? new Date(data.startDate)
        : null;

  if (data.status && data.status !== existing.status) {
    await db.staffStatusHistory.create({
      data: {
        staffId: id,
        oldStatus: existing.status,
        newStatus: data.status,
        reason: data.statusReason
          ? sanitizePlainText(data.statusReason, 400)
          : null,
        changedById: auth.user.id,
      },
    });
  }

  const updated = await db.staffProfile.update({
    where: { id },
    data: {
      memberId: data.memberId === undefined ? undefined : data.memberId,
      departmentId: data.departmentId === undefined ? undefined : data.departmentId,
      positionId: data.positionId === undefined ? undefined : data.positionId,
      supervisorId: data.supervisorId === undefined ? undefined : data.supervisorId,
      status: data.status,
      startDate:
        startDate === undefined
          ? undefined
          : startDate && !Number.isNaN(startDate.getTime())
            ? startDate
            : null,
      workEmail: data.workEmail === undefined ? undefined : data.workEmail || null,
      workPhone:
        data.workPhone === undefined
          ? undefined
          : data.workPhone
            ? sanitizePlainText(data.workPhone, 40)
            : null,
      notes:
        data.notes === undefined
          ? undefined
          : data.notes
            ? sanitizePlainText(data.notes, 2000)
            : null,
      staffNumber:
        data.staffNumber === undefined
          ? undefined
          : data.staffNumber
            ? sanitizePlainText(data.staffNumber, 40)
            : null,
    },
    include: staffListInclude,
  });

  return success(serializeStaff(updated), 'Staff profile updated.');
}
