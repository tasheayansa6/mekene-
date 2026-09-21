import { sanitizePlainText, isSafePublicUrl } from '@/lib/content/sanitize';

export const ALLOWED_BLOCK_TYPES = [
  'heading',
  'paragraph',
  'image',
  'quote',
  'button',
  'divider',
  'spacer',
  'faq',
  'event_list',
  'sermon_list',
  'ministry_list',
  'gallery_preview',
  'cta',
] as const;

export type BlockType = (typeof ALLOWED_BLOCK_TYPES)[number];

export interface ContentBlock {
  id?: string;
  type: BlockType;
  [key: string]: unknown;
}

const BLOCK_SET = new Set<string>(ALLOWED_BLOCK_TYPES);
const UNSAFE_STRING = /^\s*(javascript|data|vbscript):|<script|on\w+\s*=/i;

function sanitizeBlockString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || UNSAFE_STRING.test(trimmed)) return undefined;
  return sanitizePlainText(trimmed, maxLength);
}

function sanitizeBlockUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || UNSAFE_STRING.test(trimmed)) return undefined;
  if (trimmed.startsWith('/')) return trimmed.slice(0, 500);
  if (isSafePublicUrl(trimmed)) return trimmed.slice(0, 500);
  return undefined;
}

function validateSingleBlock(raw: unknown, index: number): ContentBlock {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`blocks[${index}]: invalid block`);
  }

  const block = raw as Record<string, unknown>;
  const type = block.type;
  if (typeof type !== 'string' || !BLOCK_SET.has(type)) {
    throw new Error(`blocks[${index}]: unsupported block type`);
  }

  const sanitized: ContentBlock = { type: type as BlockType };
  if (typeof block.id === 'string') {
    sanitized.id = sanitizePlainText(block.id, 80);
  }

  switch (type) {
    case 'heading':
      sanitized.text = sanitizeBlockString(block.text, 200) ?? '';
      sanitized.level = [1, 2, 3, 4].includes(Number(block.level)) ? Number(block.level) : 2;
      break;
    case 'paragraph':
      sanitized.text = sanitizeBlockString(block.text, 5000) ?? '';
      break;
    case 'image':
      sanitized.src = sanitizeBlockUrl(block.src) ?? '';
      sanitized.alt = sanitizeBlockString(block.alt, 180) ?? '';
      sanitized.caption = sanitizeBlockString(block.caption, 300);
      break;
    case 'quote':
      sanitized.text = sanitizeBlockString(block.text, 1000) ?? '';
      sanitized.attribution = sanitizeBlockString(block.attribution, 120);
      break;
    case 'button':
      sanitized.label = sanitizeBlockString(block.label, 80) ?? '';
      sanitized.href = sanitizeBlockUrl(block.href) ?? '#';
      break;
    case 'divider':
    case 'spacer':
      if (block.size === 'sm' || block.size === 'md' || block.size === 'lg') {
        sanitized.size = block.size;
      }
      break;
    case 'faq':
      sanitized.category = sanitizeBlockString(block.category, 80);
      sanitized.limit =
        typeof block.limit === 'number' && block.limit >= 1 && block.limit <= 20
          ? Math.floor(block.limit)
          : 5;
      break;
    case 'event_list':
    case 'sermon_list':
    case 'ministry_list':
      sanitized.limit =
        typeof block.limit === 'number' && block.limit >= 1 && block.limit <= 12
          ? Math.floor(block.limit)
          : 3;
      break;
    case 'gallery_preview':
      sanitized.albumSlug = sanitizeBlockString(block.albumSlug, 80);
      sanitized.limit =
        typeof block.limit === 'number' && block.limit >= 1 && block.limit <= 12
          ? Math.floor(block.limit)
          : 4;
      break;
    case 'cta':
      sanitized.title = sanitizeBlockString(block.title, 120) ?? '';
      sanitized.text = sanitizeBlockString(block.text, 500) ?? '';
      sanitized.buttonLabel = sanitizeBlockString(block.buttonLabel, 80);
      sanitized.buttonHref = sanitizeBlockUrl(block.buttonHref);
      break;
    default:
      throw new Error(`blocks[${index}]: unsupported block type`);
  }

  return sanitized;
}

export function validateBlocks(blocks: unknown): ContentBlock[] {
  if (!Array.isArray(blocks)) {
    throw new Error('blocks must be an array');
  }
  if (blocks.length > 50) {
    throw new Error('blocks exceed maximum of 50');
  }
  return blocks.map((block, index) => validateSingleBlock(block, index));
}
