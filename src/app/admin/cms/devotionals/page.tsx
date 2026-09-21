import { redirect } from 'next/navigation';

export default function CmsDevotionalsAliasPage() {
  redirect('/admin/sermons?contentType=devotion');
}
