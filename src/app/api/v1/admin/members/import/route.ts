import { error, forbidden, success } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { canImportMembers } from '@/lib/members/access';
import { createImportJob } from '@/lib/members/import';

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'members', 'import');
  if (!auth.ok) return auth.error;
  if (!canImportMembers(auth.user)) return forbidden();

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return error('Upload a CSV file.', 400);
  }
  const text = await file.text();
  const result = await createImportJob({
    fileName: file.name || 'members.csv',
    csvText: text,
    createdById: auth.user.id,
    request,
  });
  return success(
    {
      job: {
        id: result.job.id,
        status: result.job.status,
        fileName: result.job.fileName,
        totalRows: result.job.totalRows,
        validRows: result.job.validRows,
        invalidRows: result.job.invalidRows,
        duplicateRows: result.job.duplicateRows,
      },
      preview: result.preview.slice(0, 50),
    },
    'Import validated. Review preview before confirming.',
    201
  );
}
