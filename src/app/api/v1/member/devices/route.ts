import { db } from '@/lib/db';
import { success, validationError } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { hashToken } from '@/lib/auth/tokens';
import { z } from 'zod';
import { formatZodErrors } from '@/lib/auth/validation';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const rows = await db.memberDevice.findMany({
    where: { userId: auth.user.id, revokedAt: null },
    orderBy: { lastSeenAt: 'desc' },
    select: { id: true, platform: true, lastSeenAt: true, createdAt: true, userAgent: true },
  });

  return success({
    devices: rows.map((row) => ({
      id: row.id,
      platform: row.platform,
      lastSeenAt: row.lastSeenAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      userAgent: row.userAgent,
    })),
  });
}

const registerSchema = z.object({
  token: z.string().min(8).max(500),
  platform: z.enum(['web', 'android', 'ios']).default('web'),
});

export async function POST(request: Request) {
  const csrf = rejectIfCsrfInvalid(request);
  if (csrf) return csrf;
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const parsed = registerSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const tokenHash = hashToken(parsed.data.token);
  const device = await db.memberDevice.upsert({
    where: { userId_tokenHash: { userId: auth.user.id, tokenHash } },
    update: {
      platform: parsed.data.platform,
      lastSeenAt: new Date(),
      revokedAt: null,
      userAgent: request.headers.get('user-agent'),
    },
    create: {
      userId: auth.user.id,
      tokenHash,
      platform: parsed.data.platform,
      userAgent: request.headers.get('user-agent'),
    },
  });

  return success({ device: { id: device.id, platform: device.platform } }, 'Device registered.', 201);
}
