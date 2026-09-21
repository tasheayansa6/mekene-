import { db } from '@/lib/db';
import { forbidden, notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { canManageBaptism, canViewBaptism, memberByIdWhere } from '@/lib/members/access';
import { sanitizePlainText } from '@/lib/content/sanitize';
import { z } from 'zod';
import { formatZodErrors } from '@/lib/auth/validation';

type RouteContext = { params: Promise<{ id: string }> };

const schema = z.object({
  confirmedAt: z.string().min(1),
  location: z.string().trim().max(200).nullable().optional(),
  officiant: z.string().trim().max(120).nullable().optional(),
  certificateRef: z.string().trim().max(120).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export async function GET(request: Request, context: RouteContext) {
  const auth = await guardAdminRead(request, 'members', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewBaptism(auth.user)) return forbidden();
  const { id } = await context.params;
  const member = await db.member.findFirst({ where: memberByIdWhere(auth.user, id) });
  if (!member) return notFound('Member');
  const rows = await db.confirmationRecord.findMany({
    where: { memberId: id },
    orderBy: { confirmedAt: 'desc' },
  });
  return success(
    rows.map((row) => ({
      id: row.id,
      confirmedAt: row.confirmedAt.toISOString(),
      location: row.location,
      officiant: row.officiant,
      certificateRef: row.certificateRef,
      notes: row.notes,
    }))
  );
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'members', 'moderate');
  if (!auth.ok) return auth.error;
  if (!canManageBaptism(auth.user)) return forbidden();
  const { id } = await context.params;
  const member = await db.member.findFirst({ where: memberByIdWhere(auth.user, id) });
  if (!member) return notFound('Member');
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const confirmedAt = new Date(parsed.data.confirmedAt);
  if (Number.isNaN(confirmedAt.getTime())) {
    return validationError({ confirmedAt: ['Invalid date.'] });
  }
  const row = await db.confirmationRecord.create({
    data: {
      memberId: id,
      confirmedAt,
      location: parsed.data.location ? sanitizePlainText(parsed.data.location, 200) : null,
      officiant: parsed.data.officiant ? sanitizePlainText(parsed.data.officiant, 120) : null,
      certificateRef: parsed.data.certificateRef
        ? sanitizePlainText(parsed.data.certificateRef, 120)
        : null,
      notes: parsed.data.notes ? sanitizePlainText(parsed.data.notes, 2000) : null,
      recordedById: auth.user.id,
    },
  });
  return success(row, 'Confirmation record created.', 201);
}
