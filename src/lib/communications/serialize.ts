type PublicUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  profileImage: string | null;
};

export function serializePublicUser(user: PublicUser) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    profileImage: user.profileImage,
  };
}

export function serializeMessage(message: {
  id: string;
  body: string;
  attachmentUrl: string | null;
  createdAt: Date;
  sender: PublicUser;
}) {
  return {
    id: message.id,
    body: message.body,
    attachmentUrl: message.attachmentUrl,
    createdAt: message.createdAt.toISOString(),
    sender: serializePublicUser(message.sender),
  };
}

export function serializeConversation(conversation: {
  id: string;
  kind: string;
  subject: string | null;
  updatedAt: Date;
  createdAt: Date;
  participants: Array<{
    id: string;
    roleLabel: string | null;
    lastReadAt: Date | null;
    user: PublicUser;
  }>;
  messages: Array<{
    id: string;
    body: string;
    attachmentUrl: string | null;
    createdAt: Date;
    sender: PublicUser;
  }>;
}) {
  return {
    id: conversation.id,
    kind: conversation.kind,
    subject: conversation.subject,
    updatedAt: conversation.updatedAt.toISOString(),
    createdAt: conversation.createdAt.toISOString(),
    participants: conversation.participants.map((p) => ({
      id: p.id,
      roleLabel: p.roleLabel,
      lastReadAt: p.lastReadAt?.toISOString() ?? null,
      user: serializePublicUser(p.user),
    })),
    messages: conversation.messages.map(serializeMessage),
  };
}

export function serializeTemplate(template: {
  id: string;
  name: string;
  slug: string;
  category: string;
  subject: string | null;
  body: string;
  variables: string | null;
  channels: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  let variables: string[] = [];
  if (template.variables) {
    try {
      const parsed = JSON.parse(template.variables) as unknown;
      if (Array.isArray(parsed)) variables = parsed.filter((v) => typeof v === 'string');
    } catch {
      variables = [];
    }
  }
  return {
    id: template.id,
    name: template.name,
    slug: template.slug,
    category: template.category,
    subject: template.subject,
    body: template.body,
    variables,
    channels: template.channels.split(',').map((c) => c.trim()).filter(Boolean),
    isActive: template.isActive,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}
