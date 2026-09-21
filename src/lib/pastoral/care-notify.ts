import { db } from '@/lib/db';
import { emitPastoralEvent } from './events';

/** Notify pastoral staff about a new member care request (generic copy only). */
export async function notifyPastoralStaffOfCareRequest(input: {
  actorId: string;
  caseId: string;
  request?: Request;
}) {
  const staff = await db.user.findMany({
    where: {
      status: 'active',
      isVerified: true,
      role: {
        permissions: {
          some: {
            permission: {
              resource: 'pastoral',
              action: { in: ['view', 'manage', 'create'] },
            },
          },
        },
      },
    },
    select: { id: true },
    take: 5,
  });

  for (const user of staff) {
    if (user.id === input.actorId) continue;
    await emitPastoralEvent({
      type: 'case_assigned',
      actorId: input.actorId,
      entityId: input.caseId,
      recipientUserId: user.id,
      request: input.request,
    });
  }
}
