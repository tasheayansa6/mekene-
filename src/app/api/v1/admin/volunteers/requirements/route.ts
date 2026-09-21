import { db } from '@/lib/db';
import { forbidden, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { canManageVolunteers, canViewVolunteers } from '@/lib/volunteers/access';
import { formatZodErrors, ministryRequirementSchema } from '@/lib/volunteers/validation';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'volunteers', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewVolunteers(auth.user)) return forbidden();
  const ministryId = new URL(request.url).searchParams.get('ministryId') || undefined;
  const rows = await db.volunteerMinistryRequirement.findMany({
    where: ministryId ? { ministryId } : {},
    include: {
      skill: { select: { id: true, name: true } },
      program: { select: { id: true, name: true } },
      role: { select: { id: true, name: true } },
    },
    take: 200,
  });
  return success({ requirements: rows });
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'volunteers', 'manage');
  if (!auth.ok) return auth.error;
  if (!canManageVolunteers(auth.user)) return forbidden();
  const parsed = ministryRequirementSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const row = await db.volunteerMinistryRequirement.create({
    data: {
      ministryId: parsed.data.ministryId,
      teamId: parsed.data.teamId || null,
      roleId: parsed.data.roleId || null,
      skillId: parsed.data.skillId || null,
      programId: parsed.data.programId || null,
      minAgeYears: parsed.data.minAgeYears ?? null,
      requireTeamMembership: parsed.data.requireTeamMembership ?? false,
      blockIfExpired: parsed.data.blockIfExpired ?? true,
      isMandatory: parsed.data.isMandatory ?? true,
    },
  });
  return success(row, 'Requirement saved.', 201);
}
