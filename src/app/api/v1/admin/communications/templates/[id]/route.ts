import { z } from 'zod';
import { db } from '@/lib/db';
import { forbidden, notFound, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson } from '@/lib/auth/http';
import {
  canManageTemplates,
  canViewCommunications,
} from '@/lib/communications/access';
import {
  extractTemplateVariables,
  getCommunicationTemplateById,
  validateTemplateVariables,
} from '@/lib/communications/templates';
import { serializeTemplate } from '@/lib/communications/serialize';

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  category: z.string().trim().min(1).max(60).optional(),
  subject: z.string().trim().max(200).nullable().optional(),
  body: z.string().trim().min(1).max(5000).optional(),
  channels: z.array(z.enum(['in_app', 'email', 'telegram', 'sms'])).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminRead(request, 'communications', 'view');
  if (!auth.ok) return auth.error;
  if (!canManageTemplates(auth.user) && !canViewCommunications(auth.user)) {
    return forbidden();
  }

  const { id } = await context.params;
  const template = await getCommunicationTemplateById(id);
  if (!template) return notFound('Template');

  return success({ template: serializeTemplate(template) });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'communications', 'moderate');
  if (!auth.ok) return auth.error;
  if (!canManageTemplates(auth.user)) return forbidden();

  const { id } = await context.params;
  const existing = await getCommunicationTemplateById(id);
  if (!existing) return notFound('Template');

  const parsed = patchSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  if (parsed.data.body) {
    const validation = validateTemplateVariables(parsed.data.body);
    if (!validation.ok) {
      return validationError({
        body: [`Unknown template variables: ${validation.unknown.join(', ')}`],
      });
    }
  }

  const body = parsed.data.body ?? existing.body;
  const variables = extractTemplateVariables(body);

  const template = await db.communicationTemplate.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.category !== undefined ? { category: parsed.data.category } : {}),
      ...(parsed.data.subject !== undefined ? { subject: parsed.data.subject } : {}),
      ...(parsed.data.body !== undefined ? { body: parsed.data.body } : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
      ...(parsed.data.channels ? { channels: parsed.data.channels.join(',') } : {}),
      variables: JSON.stringify(variables),
    },
  });

  return success({ template: serializeTemplate(template) }, 'Template updated.');
}
