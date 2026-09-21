import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';
import { isBlockedUploadFilename } from '@/lib/sermons/media-security';

const ALLOWED: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'text/plain': 'txt',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

export const MAX_MEMBER_DOCUMENT_BYTES = 15 * 1024 * 1024;

export async function saveMemberDocumentFile(file: File, memberId: string) {
  if (isBlockedUploadFilename(file.name)) {
    throw new Error('This file type is not allowed.');
  }
  const ext = ALLOWED[file.type];
  if (!ext) {
    throw new Error('Documents must be PDF, image, Word, or plain text.');
  }
  if (file.size > MAX_MEMBER_DOCUMENT_BYTES) {
    throw new Error('Documents must be 15MB or smaller.');
  }

  const dir = path.join(process.cwd(), 'public', 'uploads', 'members', memberId);
  await mkdir(dir, { recursive: true });
  const safeBase =
    file.name
      .toLowerCase()
      .replace(/[^a-z0-9.\-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'document';
  const filename = `${Date.now()}-${randomBytes(4).toString('hex')}-${safeBase}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return {
    fileUrl: `/uploads/members/${memberId}/${filename}`,
    fileName: file.name.slice(0, 180),
    fileMime: file.type,
    fileSize: file.size,
  };
}

export function memberDocumentRelativePath(fileUrl: string): string | null {
  const relative = fileUrl.replace(/^\//, '').split('?')[0];
  if (!relative.startsWith('uploads/members/')) return null;
  if (relative.includes('..')) return null;
  return relative;
}
