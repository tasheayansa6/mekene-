import { notFound, redirect } from 'next/navigation';
import { resolveGivingQr } from '@/lib/giving/qr';

export default async function GivingQrRedirectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resolved = await resolveGivingQr(slug);
  if (!resolved) notFound();
  redirect(resolved.path);
}
