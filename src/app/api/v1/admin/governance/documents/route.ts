import { db } from '@/lib/db';
import { badRequest, forbidden, paginated, success } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import {
  canAccessDocument,
  canManageGovernance,
  canViewGovernance,
} from '@/lib/governance/access';
import { DOCUMENT_ACCESS_LEVELS, isOneOf } from '@/lib/governance/status';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'governance', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewGovernance(auth.user)) return forbidden();

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') || 20)));
  const committeeId = url.searchParams.get('committeeId') || undefined;
  const accessLevel = url.searchParams.get('accessLevel') || undefined;
  const meetingId = url.searchParams.get('meetingId') || undefined;

  const where = {
    ...(committeeId ? { committeeId } : {}),
    ...(meetingId ? { meetingId } : {}),
    ...(accessLevel && isOneOf(accessLevel, DOCUMENT_ACCESS_LEVELS)
      ? { accessLevel }
      : {}),
  };

  const member = await db.member.findFirst({
    where: { userId: auth.user.id },
    select: { id: true },
  });

  const [totalItems, rows] = await Promise.all([
    db.governanceDocument.count({ where }),
    db.governanceDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const filtered = rows.filter((doc) =>
    canAccessDocument(auth.user, doc, { isMember: Boolean(member) })
  );

  return paginated(
    filtered.map((doc) => ({
      id: doc.id,
      title: doc.title,
      description: doc.description,
      fileKey: doc.fileKey,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      version: doc.version,
      accessLevel: doc.accessLevel,
      committeeId: doc.committeeId,
      policyId: doc.policyId,
      resolutionId: doc.resolutionId,
      meetingId: doc.meetingId,
      uploadedById: doc.uploadedById,
      status: doc.status,
      createdAt: doc.createdAt.toISOString(),
    })),
    { page, pageSize, totalItems: filtered.length || totalItems }
  );
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'governance', 'create');
  if (!auth.ok) return auth.error;
  if (!canManageGovernance(auth.user)) return forbidden();

  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body || typeof body.fileKey !== 'string' || !body.fileKey) {
    return badRequest('fileKey is required.');
  }
  if (typeof body.title !== 'string' || !body.title.trim()) {
    return badRequest('title is required.');
  }

  const accessLevel =
    typeof body.accessLevel === 'string' &&
    isOneOf(body.accessLevel, DOCUMENT_ACCESS_LEVELS)
      ? body.accessLevel
      : 'restricted';

  const row = await db.governanceDocument.create({
    data: {
      title: body.title.trim(),
      description: typeof body.description === 'string' ? body.description : null,
      fileKey: body.fileKey,
      mimeType: typeof body.mimeType === 'string' ? body.mimeType : null,
      sizeBytes: typeof body.sizeBytes === 'number' ? body.sizeBytes : null,
      accessLevel,
      committeeId: typeof body.committeeId === 'string' ? body.committeeId : null,
      policyId: typeof body.policyId === 'string' ? body.policyId : null,
      resolutionId: typeof body.resolutionId === 'string' ? body.resolutionId : null,
      meetingId: typeof body.meetingId === 'string' ? body.meetingId : null,
      uploadedById: auth.user.id,
    },
  });

  return success(
    {
      id: row.id,
      title: row.title,
      fileKey: row.fileKey,
      accessLevel: row.accessLevel,
      committeeId: row.committeeId,
    },
    'Document metadata recorded.',
    201
  );
}
