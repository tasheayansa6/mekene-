import { error, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { getOrCreateMenuByLocation, replaceMenuItems } from '@/lib/cms/menus';
import { cmsMenuLocationSchema, formatZodErrors, menuReplaceSchema } from '@/lib/cms/validation';

type RouteContext = { params: Promise<{ location: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await guardAdminRead(request, 'content', 'view');
  if (!auth.ok) return auth.error;

  const { location: rawLocation } = await context.params;
  const parsed = cmsMenuLocationSchema.safeParse(rawLocation);
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const menu = await getOrCreateMenuByLocation(parsed.data);
  return success(menu);
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'content', 'update');
  if (!auth.ok) return auth.error;

  const { location: rawLocation } = await context.params;
  const locationParsed = cmsMenuLocationSchema.safeParse(rawLocation);
  if (!locationParsed.success) return validationError(formatZodErrors(locationParsed.error));

  const bodyParsed = menuReplaceSchema.safeParse(await readJson(request));
  if (!bodyParsed.success) return validationError(formatZodErrors(bodyParsed.error));

  const menu = await getOrCreateMenuByLocation(locationParsed.data, auth.user.id);
  try {
    const updated = await replaceMenuItems(menu.id, bodyParsed.data.items, auth.user.id);
    return success(updated, 'Menu updated.');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'invalid-menu';
    if (message === 'unsafe-href' || message === 'invalid-href' || message === 'empty-href') {
      return validationError({ href: ['Menu links must be relative paths or http(s) URLs.'] });
    }
    if (message === 'circular-parent') {
      return validationError({ parentId: ['Menu item parent would create a circular reference.'] });
    }
    return error('Could not update menu.', 422);
  }
}
