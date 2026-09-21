import { success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { listHomepageSections, reorderHomepageSections, updateHomepageSection } from '@/lib/cms/homepage';
import { formatZodErrors, homepageBatchSchema } from '@/lib/cms/validation';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'content', 'view');
  if (!auth.ok) return auth.error;
  const sections = await listHomepageSections();
  return success(sections);
}

export async function PUT(request: Request) {
  const auth = await guardAdminWrite(request, 'content', 'update');
  if (!auth.ok) return auth.error;

  const parsed = homepageBatchSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { orderedIds, sections } = parsed.data;
  if (orderedIds?.length) {
    await reorderHomepageSections(orderedIds);
  }
  if (sections?.length) {
    for (const item of sections) {
      await updateHomepageSection(item.id, item.data);
    }
  }

  const updated = await listHomepageSections();
  return success(updated, 'Homepage sections updated.');
}
