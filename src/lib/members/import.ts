import { randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { findPossibleDuplicateMembers } from './duplicates';
import { nextMembershipNumber } from './number';
import { emitMembershipEvent } from './events';

export type ImportRow = {
  row: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  membershipType?: string;
  status?: string;
  membershipNumber?: string;
};

export type ValidatedImportRow = ImportRow & {
  valid: boolean;
  errors: string[];
  duplicateWarnings: string[];
};

function parseCsv(text: string): ImportRow[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
  const rows: ImportRow[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] || '';
    });
    rows.push({
      row: i + 1,
      email: obj.email || undefined,
      firstName: obj.firstname || obj.first_name || obj['first name'] || undefined,
      lastName: obj.lastname || obj.last_name || obj['last name'] || undefined,
      phone: obj.phone || undefined,
      membershipType: obj.membershiptype || obj.membership_type || obj.type || undefined,
      status: obj.status || undefined,
      membershipNumber: obj.membershipnumber || obj.membership_number || obj.member_id || undefined,
    });
  }
  return rows;
}

export async function validateImportRows(rows: ImportRow[]): Promise<ValidatedImportRow[]> {
  const types = await db.membershipType.findMany({ where: { isActive: true } });
  const typeBySlug = new Map(types.map((t) => [t.slug.toLowerCase(), t]));
  const typeByName = new Map(types.map((t) => [t.name.toLowerCase(), t]));

  const out: ValidatedImportRow[] = [];
  for (const row of rows) {
    const errors: string[] = [];
    const duplicateWarnings: string[] = [];
    if (!row.email?.includes('@')) errors.push('Valid email is required.');
    if (!row.firstName?.trim()) errors.push('First name is required.');
    if (!row.lastName?.trim()) errors.push('Last name is required.');
    if (row.status && !['active', 'inactive', 'visitor', 'approved'].includes(row.status)) {
      errors.push('Invalid status.');
    }
    if (row.membershipType) {
      const key = row.membershipType.toLowerCase();
      if (!typeBySlug.has(key) && !typeByName.has(key)) {
        errors.push('Unknown membership type.');
      }
    }
    if (row.email) {
      const dups = await findPossibleDuplicateMembers({
        email: row.email,
        phone: row.phone,
        firstName: row.firstName,
        lastName: row.lastName,
        membershipNumber: row.membershipNumber,
      });
      if (dups.length) {
        duplicateWarnings.push(
          ...dups.map((d) => `${d.membershipNumber || d.memberId} (${d.matchReasons.join(',')})`)
        );
      }
    }
    out.push({
      ...row,
      valid: errors.length === 0,
      errors,
      duplicateWarnings,
    });
  }
  return out;
}

export async function createImportJob(input: {
  fileName: string;
  csvText: string;
  createdById: string;
  request?: Request;
}) {
  const parsed = parseCsv(input.csvText);
  const validated = await validateImportRows(parsed);
  const validRows = validated.filter((r) => r.valid).length;
  const invalidRows = validated.filter((r) => !r.valid).length;
  const duplicateRows = validated.filter((r) => r.duplicateWarnings.length).length;

  const job = await db.memberImportJob.create({
    data: {
      fileName: input.fileName.slice(0, 200),
      status: 'validated',
      totalRows: validated.length,
      validRows,
      invalidRows,
      duplicateRows,
      previewJson: JSON.stringify(validated.slice(0, 200)),
      errorReport: JSON.stringify(
        validated.filter((r) => !r.valid || r.duplicateWarnings.length).slice(0, 500)
      ),
      createdById: input.createdById,
    },
  });

  await emitMembershipEvent({
    type: 'membership.import_validated',
    userId: input.createdById,
    entityId: job.id,
    request: input.request,
    details: { totalRows: job.totalRows, validRows, invalidRows },
  });

  return { job, preview: validated };
}

export async function confirmImportJob(input: {
  jobId: string;
  createdById: string;
  request?: Request;
}) {
  const job = await db.memberImportJob.findUnique({ where: { id: input.jobId } });
  if (!job || job.status !== 'validated') {
    throw new Error('Import job is not ready to confirm.');
  }
  const preview = JSON.parse(job.previewJson || '[]') as ValidatedImportRow[];
  const types = await db.membershipType.findMany();
  const typeBySlug = new Map(types.map((t) => [t.slug.toLowerCase(), t.id]));
  const typeByName = new Map(types.map((t) => [t.name.toLowerCase(), t.id]));
  const memberRole = await db.role.findUnique({ where: { slug: 'member' } });
  if (!memberRole) throw new Error('Member role missing.');

  let imported = 0;
  for (const row of preview) {
    if (!row.valid || row.duplicateWarnings.length) continue;
    const email = row.email!.trim().toLowerCase();
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      const existingMember = await db.member.findUnique({ where: { userId: existingUser.id } });
      if (existingMember) continue;
    }

    const typeKey = row.membershipType?.toLowerCase();
    const membershipTypeId = typeKey
      ? typeBySlug.get(typeKey) || typeByName.get(typeKey) || null
      : null;

    const tempPassword = randomBytes(18).toString('base64url');
    const passwordHash = await hashPassword(tempPassword);

    await db.$transaction(async (tx) => {
      const user =
        existingUser ||
        (await tx.user.create({
          data: {
            email,
            firstName: row.firstName!.trim(),
            lastName: row.lastName!.trim(),
            phone: row.phone || null,
            status: 'active',
            isVerified: false,
            roleId: memberRole.id,
            passwordHash,
          },
        }));
      await tx.member.create({
        data: {
          userId: user.id,
          membershipNumber: row.membershipNumber || (await nextMembershipNumber()),
          status: (row.status as 'active') || 'active',
          membershipTypeId,
          dateJoined: new Date(),
          directoryVisibility: 'private',
        },
      });
    });
    imported += 1;
  }

  const updated = await db.memberImportJob.update({
    where: { id: job.id },
    data: {
      status: 'completed',
      importedRows: imported,
      confirmedAt: new Date(),
      completedAt: new Date(),
    },
  });

  await emitMembershipEvent({
    type: 'membership.import_completed',
    userId: input.createdById,
    entityId: job.id,
    request: input.request,
    details: { importedRows: imported },
  });

  return updated;
}
