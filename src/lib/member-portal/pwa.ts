const NEVER_CACHE_PREFIXES = [
  '/member',
  '/admin',
  '/profile',
  '/api/',
  '/give/receipt',
  '/give/now',
  '/give/success',
  '/login',
  '/register',
  '/messages',
];

export function shouldNeverCachePath(pathname: string): boolean {
  const path = pathname.split('?')[0] || '/';
  return NEVER_CACHE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`) || (prefix.endsWith('/') && path.startsWith(prefix))
  );
}

export function isPublicShellPath(pathname: string): boolean {
  if (shouldNeverCachePath(pathname)) return false;
  return (
    pathname === '/' ||
    pathname === '/offline' ||
    pathname === '/manifest.webmanifest' ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/_next/static/')
  );
}
