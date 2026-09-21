import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { randomBytes } from 'crypto';

const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const RESOURCE_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
};

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_RESOURCE_BYTES = 15 * 1024 * 1024;

function publicUrl(folder: string, filename: string) {
  return `/uploads/${folder}/${filename}`;
}

export async function saveContentImage(file: File, folder: 'content' | 'resources' | 'sermons' | 'events' | 'gallery') {
  const ext = IMAGE_TYPES[file.type];
  if (!ext) {
    throw new Error('Images must be JPEG, PNG, or WebP.');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Images must be 5MB or smaller.');
  }
  const dir = path.join(process.cwd(), 'public', 'uploads', folder);
  await mkdir(dir, { recursive: true });
  const filename = `${Date.now()}-${randomBytes(6).toString('hex')}.webp`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const optimized = await sharp(buffer)
    .rotate()
    .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  await writeFile(path.join(dir, filename), optimized);
  return publicUrl(folder, filename);
}

export async function saveResourceFile(file: File) {
  const ext = RESOURCE_TYPES[file.type];
  if (!ext) {
    throw new Error('Resources must be PDF, Word, or plain text files.');
  }
  if (file.size > MAX_RESOURCE_BYTES) {
    throw new Error('Resource files must be 15MB or smaller.');
  }
  const dir = path.join(process.cwd(), 'public', 'uploads', 'resources');
  await mkdir(dir, { recursive: true });
  const safeBase = file.name
    .toLowerCase()
    .replace(/[^a-z0-9.\-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'resource';
  const filename = `${Date.now()}-${randomBytes(4).toString('hex')}-${safeBase}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);
  return {
    fileUrl: publicUrl('resources', filename),
    fileName: file.name.slice(0, 180),
    fileMime: file.type,
    fileSize: file.size,
  };
}

const AUDIO_TYPES: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/m4a': 'm4a',
  'audio/wav': 'wav',
  'audio/wave': 'wav',
  'audio/x-wav': 'wav',
};

export const MAX_AUDIO_BYTES = 40 * 1024 * 1024;

function fileExtension(name: string) {
  const part = name.toLowerCase().split('.').pop() || '';
  return part.replace(/[^a-z0-9]/g, '');
}

function sniffAudio(buffer: Buffer): 'mp3' | 'm4a' | 'wav' | null {
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WAVE') {
    return 'wav';
  }
  if (buffer.length >= 3 && buffer.toString('ascii', 0, 3) === 'ID3') return 'mp3';
  if (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) return 'mp3';
  if (buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp') return 'm4a';
  return null;
}

export async function saveSermonAudio(file: File) {
  const mimeExt = AUDIO_TYPES[file.type];
  if (!mimeExt) {
    throw new Error('Audio must be MP3, M4A, or WAV.');
  }
  if (file.size > MAX_AUDIO_BYTES) {
    throw new Error('Audio files must be 40MB or smaller.');
  }
  const nameExt = fileExtension(file.name);
  if (nameExt && !['mp3', 'm4a', 'wav', 'mpeg'].includes(nameExt)) {
    throw new Error('Audio must be MP3, M4A, or WAV.');
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffAudio(buffer);
  if (!sniffed) {
    throw new Error('The uploaded file is not a valid audio file.');
  }
  const dir = path.join(process.cwd(), 'public', 'uploads', 'sermons');
  await mkdir(dir, { recursive: true });
  const filename = `${Date.now()}-${randomBytes(6).toString('hex')}.${sniffed}`;
  await writeFile(path.join(dir, filename), buffer);
  return {
    fileUrl: publicUrl('sermons', filename),
    fileName: file.name.slice(0, 180),
    fileMime: file.type,
    fileSize: file.size,
  };
}

export async function saveSermonNotes(file: File) {
  const ext = RESOURCE_TYPES[file.type];
  if (!ext) {
    throw new Error('Sermon notes must be PDF, Word, or plain text files.');
  }
  if (file.size > MAX_RESOURCE_BYTES) {
    throw new Error('Notes files must be 15MB or smaller.');
  }
  const dir = path.join(process.cwd(), 'public', 'uploads', 'sermons');
  await mkdir(dir, { recursive: true });
  const safeBase = file.name
    .toLowerCase()
    .replace(/[^a-z0-9.\-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'notes';
  const filename = `${Date.now()}-${randomBytes(4).toString('hex')}-${safeBase}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  if (ext === 'pdf' && buffer.toString('ascii', 0, 4) !== '%PDF') {
    throw new Error('The uploaded file is not a valid PDF.');
  }
  if (ext === 'txt' && buffer.includes(0x00)) {
    throw new Error('Notes files cannot contain binary executable content.');
  }
  await writeFile(path.join(dir, filename), buffer);
  return {
    fileUrl: publicUrl('sermons', filename),
    fileName: file.name.slice(0, 180),
    fileMime: file.type,
    fileSize: file.size,
  };
}

export const MIN_IMAGE_PX = 80;

function sniffImage(buffer: Buffer): 'jpeg' | 'png' | 'webp' | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'png';
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

export async function saveGalleryPhoto(file: File) {
  const mimeExt = IMAGE_TYPES[file.type];
  if (!mimeExt) {
    throw new Error('Images must be JPEG, PNG, or WebP.');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Images must be 5MB or smaller.');
  }
  const nameExt = fileExtension(file.name);
  if (nameExt && !['jpg', 'jpeg', 'png', 'webp'].includes(nameExt)) {
    throw new Error('Images must be JPEG, PNG, or WebP.');
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffImage(buffer);
  if (!sniffed) {
    throw new Error('The uploaded file is not a valid image.');
  }
  const image = sharp(buffer).rotate();
  const meta = await image.metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  if (width < MIN_IMAGE_PX || height < MIN_IMAGE_PX) {
    throw new Error('Images must be at least 80×80 pixels.');
  }
  const dir = path.join(process.cwd(), 'public', 'uploads', 'gallery');
  await mkdir(dir, { recursive: true });
  const token = randomBytes(8).toString('hex');
  const stamp = Date.now();
  const largeName = `${stamp}-${token}.webp`;
  const thumbName = `${stamp}-${token}-thumb.webp`;
  const large = await image
    .clone()
    .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  const thumb = await image
    .clone()
    .resize(640, 640, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 72 })
    .toBuffer();
  await writeFile(path.join(dir, largeName), large);
  await writeFile(path.join(dir, thumbName), thumb);
  return {
    url: publicUrl('gallery', largeName),
    thumbnailUrl: publicUrl('gallery', thumbName),
    width,
    height,
  };
}

