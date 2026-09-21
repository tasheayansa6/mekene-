import { success, validationError } from '@/lib/api/response';
import { getPublicMenu } from '@/lib/cms/menus';
import { cmsMenuLocationSchema, formatZodErrors } from '@/lib/cms/validation';

type RouteContext = { params: Promise<{ location: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { location: rawLocation } = await context.params;
  const parsed = cmsMenuLocationSchema.safeParse(rawLocation);
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const menu = await getPublicMenu(parsed.data);
  return success(menu);
}
