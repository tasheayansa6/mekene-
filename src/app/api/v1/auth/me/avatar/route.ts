import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { db } from '@/lib/db';
import { error, success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { serializeUser } from '@/lib/auth/serialize';
import { toAuthUser, userInclude } from '@/lib/auth/session';
import { rejectIfCsrfInvalid } from '@/lib/auth/http';

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) {
    return error('Please choose an image file.', 400);
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return error('Profile images must be JPEG, PNG, or WebP.', 400);
  }
  if (file.size > MAX_BYTES) {
    return error('Profile images must be 2MB or smaller.', 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
  await mkdir(dir, { recursive: true });
  const filename = `${auth.user.id}.${ext}`;
  await writeFile(path.join(dir, filename), buffer);

  const profileImage = `/uploads/avatars/${filename}?v=${Date.now()}`;
  const updated = await db.user.update({
    where: { id: auth.user.id },
    data: { profileImage },
    include: userInclude,
  });

  return success({ user: serializeUser(toAuthUser(updated)) }, 'Profile image updated.');
}

export async function DELETE(request: Request) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const updated = await db.user.update({
    where: { id: auth.user.id },
    data: { profileImage: null },
    include: userInclude,
  });

  return success({ user: serializeUser(toAuthUser(updated)) }, 'Profile image removed.');
}
