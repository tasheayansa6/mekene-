import { db } from '@/lib/db';
import { error, success, validationError } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { formatZodErrors, volunteerSkillPutSchema } from '@/lib/volunteers/validation';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;
  const member = await db.member.findUnique({
    where: { userId: auth.user.id },
    select: { id: true },
  });
  const [catalog, skills] = await Promise.all([
    db.volunteerSkillCatalog.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
    member
      ? db.volunteerSkill.findMany({
          where: { memberId: member.id },
          include: { skill: { select: { id: true, name: true, slug: true } } },
        })
      : Promise.resolve([]),
  ]);
  return success({ catalog, skills });
}

export async function PUT(request: Request) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;
  const member = await db.member.findUnique({
    where: { userId: auth.user.id },
    select: { id: true },
  });
  if (!member) return error('You do not have a church membership record yet.', 404);
  const parsed = volunteerSkillPutSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  await db.$transaction(async (tx) => {
    await tx.volunteerSkill.deleteMany({ where: { memberId: member.id } });
    if (parsed.data.skills.length) {
      await tx.volunteerSkill.createMany({
        data: parsed.data.skills.map((row) => ({
          memberId: member.id,
          skillId: row.skillId,
          proficiency: row.proficiency,
        })),
      });
    }
  });

  const skills = await db.volunteerSkill.findMany({
    where: { memberId: member.id },
    include: { skill: { select: { id: true, name: true, slug: true } } },
  });
  return success({ skills }, 'Skills updated.');
}
