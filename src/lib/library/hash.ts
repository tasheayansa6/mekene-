import { createHash } from 'crypto';

export function sha256FileBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export function isValidSubtitleFormat(format: string): boolean {
  const normalized = format.trim().toLowerCase();
  return normalized === 'vtt' || normalized === 'srt';
}

export function subtitleFormatFromFilename(filename: string): string | null {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return isValidSubtitleFormat(ext) ? ext : null;
}
