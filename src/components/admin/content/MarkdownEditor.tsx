'use client';

import dynamic from 'next/dynamic';
import { Label } from '@/components/ui/label';

const Editor = dynamic(() => import('./MarkdownEditorInner'), {
  ssr: false,
  loading: () => (
    <div className="min-h-48 rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
      Loading editor…
    </div>
  ),
});

export function MarkdownEditor({
  id,
  label,
  value,
  onChange,
  describedBy,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  describedBy?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Editor id={id} value={value} onChange={onChange} describedBy={describedBy} />
    </div>
  );
}
