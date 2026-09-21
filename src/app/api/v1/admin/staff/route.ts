import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { forbidden, paginated, success, validationError } from '@/lib/api/response';
import { enforceAdminRateLimit, guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { sanitizePlainText } from '@/lib/content/sanitize';
import { canCreateStaff, canViewStaff } from '@/lib/volunteers/access';
import { serializeStaff, staffListInclude } from '@/lib/volunteers/serialize';
import {
  formatZodErrors,
  staffCreateSchema,
  staffListSchema,
} from '@/lib/volunteers/validation';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'staff', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewStaff(auth.user)) return forbidden();
  const limited = enforceAdminRateLimit(request, auth.user.id, 'staff');
  if (limited) return limited;

  const url = new URL(request.url);
  const parsed = staffListSchema.safeParse({
    q: url.searchParams.get('q') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 20,
    status: url.searchParams.get('status') || undefined,
    departmentId: url.searchParams.get('departmentId') || undefined,
    positionId: url.searchParams.get('positionId') || undefined,
    sort: url.searchParams.get('sort') || undefined,
    dir: url.searchParams.get('dir') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { q, page, pageSize, status, departmentId, positionId, sort, dir } = parsed.data;
  const and: Prisma.StaffProfileWhereInput[] = [];
  if (status) and.push({ status });
  if (departmentId) and.push({ departmentId });
  if (positionId) and.push({ positionId });
  if (q) {
    and.push({
      OR: [
        { staffNumber: { contains: q } },
        { workEmail: { contains: q } },
        { user: { firstName: { contains: q } } },
        { user: { lastName: { contains: q } } },
        { user: { email: { contains: q } } },
      ],
    });
  }

  const where: Prisma.StaffProfileWhereInput = and.length ? { AND: and } : {};
  const orderField = ['createdAt', 'updatedAt', 'status', 'startDate'].includes(sort || '')
    ? sort!
    : 'updatedAt';

  const [totalItems, rows] = await Promise.all([
    db.staffProfile.count({ where }),
    db.staffProfile.findMany({
      where,
      include: staffListInclude,
      orderBy: { [orderField]: dir === 'asc' ? 'asc' : 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(rows.map(serializeStaff), { page, pageSize, totalItems });
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'staff', 'create');
  if (!auth.ok) return auth.error;
  if (!canCreateStaff(auth.user)) return forbidden();

  const parsed = staffCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const user = await db.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true },
  });
  if (!user) return validationError({ userId: ['User not found'] });

  const existing = await db.staffProfile.findFirst({
    where: { userId: parsed.data.userId },
    select: { id: true },
  });
  if (existing) {
    return validationError({ userId: ['This user already has a staff profile'] });
  }

  const startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : null;
  const row = await db.staffProfile.create({
    data: {
      userId: parsed.data.userId,
      memberId: parsed.data.memberId || null,
      departmentId: parsed.data.departmentId || null,
      positionId: parsed.data.positionId || null,
      supervisorId: parsed.data.supervisorId || null,
      status: parsed.data.status || 'active',
      startDate: startDate && !Number.isNaN(startDate.getTime()) ? startDate : null,
      workEmail: parsed.data.workEmail || null,
      workPhone: parsed.data.workPhone
        ? sanitizePlainText(parsed.data.workPhone, 40)
        : null,
      notes: parsed.data.notes ? sanitizePlainText(parsed.data.notes, 2000) : null,
      staffNumber: parsed.data.staffNumber
        ? sanitizePlainText(parsed.data.staffNumber, 40)
        : null,
      statusHistory: {
        create: {
          oldStatus: null,
          newStatus: parsed.data.status || 'active',
          reason: 'Initial staff profile',
          changedById: auth.user.id,
        },
      },
    },
    include: staffListInclude,
  });

  return success(serializeStaff(row), 'Staff profile created.', 201);
}
