import { z } from 'zod';
import { db } from '@/lib/db';
import { forbidden, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson } from '@/lib/auth/http';
import { uniqueSlug } from '@/lib/admin/slug';
import {
  canManageTemplates,
  canViewCommunications,
} from '@/lib/communications/access';
import {
  extractTemplateVariables,
  listCommunicationTemplates,
  validateTemplateVariables,
} from '@/lib/communications/templates';
import { serializeTemplate } from '@/lib/communications/serialize';

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(80).optional(),
  category: z.string().trim().min(1).max(60).default('general'),
  subject: z.string().trim().max(200).nullable().optional(),
  body: z.string().trim().min(1).max(5000),
  channels: z.array(z.enum(['in_app', 'email', 'telegram', 'sms'])).optional(),
});

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'communications', 'view');
  if (!auth.ok) return auth.error;
  if (!canManageTemplates(auth.user) && !canViewCommunications(auth.user)) {
    return forbidden();
  }

  const url = new URL(request.url);
  const category = url.searchParams.get('category') || undefined;
  const activeOnly = url.searchParams.get('activeOnly') === '1';

  const templates = await listCommunicationTemplates({ category, activeOnly });
  return success({ templates: templates.map(serializeTemplate) });
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'communications', 'moderate');
  if (!auth.ok) return auth.error;
  if (!canManageTemplates(auth.user)) return forbidden();

  const parsed = createSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const validation = validateTemplateVariables(parsed.data.body);
  if (!validation.ok) {
    return validationError({
      body: [`Unknown template variables: ${validation.unknown.join(', ')}`],
    });
  }

  const slug =
    parsed.data.slug ||
    (await uniqueSlug(parsed.data.name, async (candidate) => {
      const existing = await db.communicationTemplate.findUnique({ where: { slug: candidate } });
      return Boolean(existing);
    }));

  const variables = extractTemplateVariables(parsed.data.body);
  const channels = (parsed.data.channels || ['in_app', 'email']).join(',');

  const template = await db.communicationTemplate.create({
    data: {
      name: parsed.data.name,
      slug,
      category: parsed.data.category,
      subject: parsed.data.subject ?? null,
      body: parsed.data.body,
      variables: JSON.stringify(variables),
      channels,
      createdById: auth.user.id,
    },
  });

  return success({ template: serializeTemplate(template) }, 'Template created.', 201);
}
