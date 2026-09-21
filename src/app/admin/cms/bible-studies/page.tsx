import { redirect } from 'next/navigation';

export default function CmsBibleStudiesAliasPage() {
  redirect('/admin/sermons?contentType=bible_study');
}
