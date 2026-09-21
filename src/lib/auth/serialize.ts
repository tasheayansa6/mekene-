import type { AuthUser } from './permissions';

export interface SafeUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  profileImage: string | null;
  role: {
    id: string;
    slug: string;
    name: string;
  };
  permissions: Array<{ resource: string; action: string }>;
  status: string;
  isVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const SENSITIVE_KEYS = [
  'password',
  'passwordHash',
  'token',
  'tokenHash',
  'resetToken',
  'verificationToken',
  'sessionToken',
  'authSecret',
];

export function serializeUser(user: AuthUser): SafeUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    profileImage: user.profileImage,
    role: {
      id: user.role.id,
      slug: user.role.slug,
      name: user.role.name,
    },
    permissions: user.permissions.map((p) => ({
      resource: p.resource,
      action: p.action,
    })),
    status: user.status,
    isVerified: user.isVerified,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function assertNoSecrets<T extends Record<string, unknown>>(payload: T): T {
  for (const key of Object.keys(payload)) {
    if (SENSITIVE_KEYS.includes(key)) {
      throw new Error(`Refusing to serialize sensitive field: ${key}`);
    }
  }
  return payload;
}

export function toAdminUserView(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  profileImage: string | null;
  status: string;
  isVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  role: { id: string; slug: string; name: string };
}) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    profileImage: user.profileImage,
    status: user.status,
    isVerified: user.isVerified,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    role: user.role,
  };
}
