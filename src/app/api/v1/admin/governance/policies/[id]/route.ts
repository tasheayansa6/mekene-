import { db } from '@/lib/db';
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  success,
} from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { canManageGovernance, canViewGovernance } from '@/lib/governance/access';
import { emitGovernanceEvent } from '@/lib/governance/events';
import { serializePolicy } from '@/lib/governance/serialize';
import {
  assertPolicyVersionEditable,
  canTransitionPolicy,
} from '@/lib/governance/workflow';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminRead(request, 'governance', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewGovernance(auth.user)) return forbidden();

  const { id } = await context.params;
  const row = await db.governancePolicy.findUnique({
    where: { id },
    include: {
      versions: {
        orderBy: { version: 'desc' },
        select: { id: true, version: true, status: true, publishedAt: true, body: true },
      },
    },
  });
  if (!row) return notFound('Policy');

  return success({
    ...serializePolicy(row),
    versions: row.versions.map((v) => ({
      id: v.id,
      version: v.version,
      status: v.status,
      publishedAt: v.publishedAt?.toISOString() ?? null,
      body: v.body,
    })),
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'governance', 'update');
  if (!auth.ok) return auth.error;
  if (!canManageGovernance(auth.user)) return forbidden();

  const { id } = await context.params;
  const existing = await db.governancePolicy.findUnique({ where: { id } });
  if (!existing) return notFound('Policy');

  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body) return badRequest('Invalid body.');

  if (typeof body.status === 'string') {
    if (!canTransitionPolicy(existing.status, body.status)) {
      return badRequest(
        `Cannot transition policy from ${existing.status} to ${body.status}.`
      );
    }
    const updated = await db.governancePolicy.update({
      where: { id },
      data: { status: body.status as never },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          select: { id: true, version: true, status: true, publishedAt: true },
        },
      },
    });

    if (body.status === 'published') {
      const latest = await db.policyVersion.findFirst({
        where: { policyId: id },
        orderBy: { version: 'desc' },
      });
      if (latest) {
        await db.policyVersion.update({
          where: { id: latest.id },
          data: { status: 'published', publishedAt: new Date() },
        });
      }
      await emitGovernanceEvent({
        type: 'policy_published',
        actorId: auth.user.id,
        entityId: id,
        request,
      });
    }

    return success(serializePolicy(updated), 'Policy status updated.');
  }

  const data: Record<string, unknown> = {};
  if (typeof body.title === 'string') data.title = body.title.trim();
  if (typeof body.description === 'string' || body.description === null) {
    data.description = body.description;
  }
  if (typeof body.requireAck === 'boolean') data.requireAck = body.requireAck;
  if (typeof body.committeeId === 'string' || body.committeeId === null) {
    data.committeeId = body.committeeId;
  }

  const updated = await db.governancePolicy.update({
    where: { id },
    data,
    include: {
      versions: {
        orderBy: { version: 'desc' },
        select: { id: true, version: true, status: true, publishedAt: true },
      },
    },
  });

  return success(serializePolicy(updated), 'Policy updated.');
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'governance', 'update');
  if (!auth.ok) return auth.error;

  const { id } = await context.params;
  const policy = await db.governancePolicy.findUnique({ where: { id } });
  if (!policy) return notFound('Policy');

  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body) return badRequest('Invalid body.');

  if (body.acknowledge === true) {
    if (typeof body.versionId !== 'string') {
      return badRequest('versionId is required to acknowledge.');
    }
    const version = await db.policyVersion.findFirst({
      where: { id: body.versionId, policyId: id },
    });
    if (!version) return notFound('Policy version');

    const member = await db.member.findFirst({
      where: { userId: auth.user.id },
      select: { id: true },
    });

    try {
      const ack = await db.policyAcknowledgement.create({
        data: {
          policyVersionId: version.id,
          userId: auth.user.id,
          memberId: member?.id ?? null,
        },
      });
      await emitGovernanceEvent({
        type: 'policy_acknowledged',
        actorId: auth.user.id,
        entityId: ack.id,
        request,
        details: { policyId: id, versionId: version.id },
      });
      return success(
        { id: ack.id, policyVersionId: ack.policyVersionId, acknowledgedAt: ack.acknowledgedAt },
        'Policy acknowledged.',
        201
      );
    } catch {
      return conflict('Already acknowledged.');
    }
  }

  if (!canManageGovernance(auth.user)) return forbidden();
  if (typeof body.body !== 'string') {
    return badRequest('body is required for a new policy version.');
  }

  const latest = await db.policyVersion.findFirst({
    where: { policyId: id },
    orderBy: { version: 'desc' },
  });

  if (latest) {
    try {
      // Never overwrite a published/archived version — always create a new one.
      if (latest.status === 'published' || latest.status === 'archived') {
        // intentional fallthrough to create
      } else {
        assertPolicyVersionEditable(latest.status);
        // Still create a new version rather than overwrite content of an existing draft
        // when explicitly posting a new version body.
      }
    } catch {
      return conflict('Policy version is locked.');
    }
  }

  const created = await db.policyVersion.create({
    data: {
      policyId: id,
      version: (latest?.version ?? 0) + 1,
      body: body.body,
      status: 'draft',
      authorId: auth.user.id,
    },
  });

  await db.governancePolicy.update({
    where: { id },
    data: { status: 'draft' },
  });

  return success(
    {
      id: created.id,
      version: created.version,
      status: created.status,
      policyId: created.policyId,
    },
    'New policy version created.',
    201
  );
}
