'use client';

import { useState } from 'react';
import { Check, Link2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const encoded = encodeURIComponent(url);
  const text = encodeURIComponent(title);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => void copy()}>
        {copied ? <Check className="mr-2 size-4" /> : <Link2 className="mr-2 size-4" />}
        {copied ? 'Link copied' : 'Copy link'}
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={`mailto:?subject=${text}&body=${encoded}`}>
          <Share2 className="mr-2 size-4" />
          Email
        </a>
      </Button>
      <Button asChild variant="outline" size="sm">
        <a
          href={`https://wa.me/?text=${text}%20${encoded}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp
        </a>
      </Button>
    </div>
  );
}
