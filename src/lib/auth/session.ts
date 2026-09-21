import { db } from '@/lib/db';
import {
  SESSION_REMEMBER_TTL_SECONDS,
  SESSION_TTL_SECONDS,
} from './config';
import { getSessionTokenFromRequest } from './cookies';
import { generateToken, hashToken } from './tokens';
import type { AuthUser } from './permissions';

const userInclude = {
  role: {
    include: {
      permissions: {
        include: { permission: true },
      },
    },
  },
} as const;

export function toAuthUser(
  user: {
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
    role: {
      id: string;
      slug: string;
      name: string;
      hierarchy: number;
      isPrivileged: boolean;
      permissions: Array<{ permission: { resource: string; action: string } }>;
    };
  }
): AuthUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    profileImage: user.profileImage,
    status: user.status,
    isVerified: user.isVerified,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    role: {
      id: user.role.id,
      slug: user.role.slug,
      name: user.role.name,
      hierarchy: user.role.hierarchy,
      isPrivileged: user.role.isPrivileged,
    },
    permissions: user.role.permissions.map((rp) => ({
      resource: rp.permission.resource,
      action: rp.permission.action,
    })),
  };
}

export async function createSession(options: {
  userId: string;
  rememberMe?: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<{ token: string; expiresAt: Date; maxAgeSeconds: number }> {
  const token = generateToken(32);
  const maxAgeSeconds = options.rememberMe
    ? SESSION_REMEMBER_TTL_SECONDS
    : SESSION_TTL_SECONDS;
  const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000);

  await db.session.create({
    data: {
      userId: options.userId,
      tokenHash: hashToken(token),
      expiresAt,
      rememberMe: Boolean(options.rememberMe),
      ipAddress: options.ipAddress ?? null,
      userAgent: options.userAgent ?? null,
    },
  });

  return { token, expiresAt, maxAgeSeconds };
}

export async function getSessionUser(
  request: Request
): Promise<AuthUser | null> {
  const token = getSessionTokenFromRequest(request);
  if (!token) return null;
  return getUserBySessionToken(token);
}

export async function getUserBySessionToken(token: string): Promise<AuthUser | null> {
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: { include: userInclude },
    },
  });

  if (!session || session.revokedAt) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;

  return toAuthUser(session.user);
}

export async function revokeSessionToken(token: string): Promise<void> {
  await db.session.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await db.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeOtherUserSessions(userId: string, keepToken: string): Promise<number> {
  const result = await db.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      tokenHash: { not: hashToken(keepToken) },
    },
    data: { revokedAt: new Date() },
  });
  return result.count;
}

export async function loadUserById(id: string): Promise<AuthUser | null> {
  const user = await db.user.findUnique({
    where: { id },
    include: userInclude,
  });
  if (!user) return null;
  return toAuthUser(user);
}

export { userInclude };
