import { db } from '@/lib/db';
import { sanitizePlainText } from '@/lib/content/sanitize';

const STAFF_ROLE_SLUGS = ['super_admin', 'admin', 'pastor'] as const;

async function findSupportStaffUserId(): Promise<string | null> {
  const staff = await db.user.findFirst({
    where: {
      status: 'active',
      OR: [
        { role: { slug: { in: [...STAFF_ROLE_SLUGS] } } },
        {
          role: {
            permissions: {
              some: {
                permission: {
                  OR: [
                    { resource: 'pastoral', action: { in: ['view', 'manage'] } },
                    { resource: 'communications', action: { in: ['assign', 'manage'] } },
                  ],
                },
              },
            },
          },
        },
      ],
    },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  return staff?.id ?? null;
}

async function assertParticipant(conversationId: string, userId: string) {
  const participant = await db.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!participant) {
    const error = new Error('Forbidden');
    (error as Error & { status: number }).status = 403;
    throw error;
  }
  return participant;
}

const userPublicSelect = {
  id: true,
  firstName: true,
  lastName: true,
  profileImage: true,
} as const;

export async function createSupportConversation(input: {
  memberUserId: string;
  subject: string;
  body: string;
  assigneeUserId?: string | null;
}) {
  const subject = sanitizePlainText(input.subject, 200);
  const body = sanitizePlainText(input.body, 2000);
  const assigneeUserId = input.assigneeUserId ?? (await findSupportStaffUserId());

  const conversation = await db.conversation.create({
    data: {
      kind: 'support',
      subject,
      participants: {
        create: [
          { userId: input.memberUserId, roleLabel: 'member' },
          ...(assigneeUserId
            ? [{ userId: assigneeUserId, roleLabel: 'staff' as const }]
            : []),
        ],
      },
      messages: {
        create: {
          senderId: input.memberUserId,
          body,
        },
      },
    },
    include: {
      participants: { include: { user: { select: userPublicSelect } } },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: { sender: { select: userPublicSelect } },
      },
    },
  });

  return conversation;
}

export async function listConversationsForUser(
  userId: string,
  input: { page?: number; pageSize?: number }
) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  const [total, rows] = await Promise.all([
    db.conversationParticipant.count({
      where: { userId, archivedAt: null, conversation: { archivedAt: null } },
    }),
    db.conversationParticipant.findMany({
      where: { userId, archivedAt: null, conversation: { archivedAt: null } },
      skip,
      take: pageSize,
      orderBy: { conversation: { updatedAt: 'desc' } },
      include: {
        conversation: {
          include: {
            participants: { include: { user: { select: userPublicSelect } } },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: { sender: { select: userPublicSelect } },
            },
          },
        },
      },
    }),
  ]);

  return {
    page,
    pageSize,
    total,
    items: rows.map((row) => row.conversation),
  };
}

export async function getConversationForUser(conversationId: string, userId: string) {
  await assertParticipant(conversationId, userId);

  return db.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: { include: { user: { select: userPublicSelect } } },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: { sender: { select: userPublicSelect } },
      },
    },
  });
}

export async function postMessage(input: {
  conversationId: string;
  senderId: string;
  body: string;
}) {
  await assertParticipant(input.conversationId, input.senderId);
  const body = sanitizePlainText(input.body, 2000);
  if (!body) {
    throw new Error('Message body is required');
  }

  const [message] = await db.$transaction([
    db.message.create({
      data: {
        conversationId: input.conversationId,
        senderId: input.senderId,
        body,
      },
      include: { sender: { select: userPublicSelect } },
    }),
    db.conversation.update({
      where: { id: input.conversationId },
      data: { updatedAt: new Date() },
    }),
  ]);

  return message;
}

export async function markConversationRead(conversationId: string, userId: string) {
  await assertParticipant(conversationId, userId);
  return db.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadAt: new Date() },
  });
}

export async function reportMessage(input: {
  messageId: string;
  reporterId: string;
  reason: string;
}) {
  const message = await db.message.findUnique({
    where: { id: input.messageId },
    select: { conversationId: true },
  });
  if (!message) throw new Error('Message not found');

  await assertParticipant(message.conversationId, input.reporterId);
  const reason = sanitizePlainText(input.reason, 500);
  if (!reason) throw new Error('Report reason is required');

  return db.messageReport.create({
    data: {
      messageId: input.messageId,
      reporterId: input.reporterId,
      reason,
    },
  });
}
