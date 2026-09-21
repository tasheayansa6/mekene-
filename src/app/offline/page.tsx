import Link from 'next/link';

export const metadata = {
  title: 'Offline',
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">You are offline</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Public church pages may still load from this device. Member giving, messages, prayer, and profile data are never stored for offline use.
      </p>
      <p className="mt-6">
        <Link className="underline" href="/">
          Return home
        </Link>
      </p>
    </div>
  );
}
