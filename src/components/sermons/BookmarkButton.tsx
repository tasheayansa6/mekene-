'use client';

import { useEffect, useState } from 'react';
import { Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiDelete, apiGet, apiPost } from '@/lib/api/client';
import { useAuth } from '@/components/providers/AuthProvider';

type BookmarkRow = {
  id: string;
  sermon: { id: string };
};

export function BookmarkButton({
  sermonId,
  sermonSlug,
}: {
  sermonId: string;
  sermonSlug: string;
}) {
  const { status } = useAuth();
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkId, setBookmarkId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated') {
      setChecked(true);
      return;
    }
    void apiGet<BookmarkRow[]>('/member/bookmarks', { pageSize: '100' }).then((result) => {
      if (result.success && result.data) {
        const match = result.data.find((row) => row.sermon.id === sermonId);
        if (match) {
          setBookmarked(true);
          setBookmarkId(match.id);
        }
      }
      setChecked(true);
    });
  }, [status, sermonId]);

  if (status !== 'authenticated' || !checked) return null;

  async function toggle() {
    setLoading(true);
    if (bookmarked && bookmarkId) {
      const result = await apiDelete(`/member/bookmarks/${bookmarkId}`);
      if (result.success) {
        setBookmarked(false);
        setBookmarkId(null);
      }
    } else {
      const result = await apiPost<{ bookmark: { id: string; sermonId: string } }>(
        '/member/bookmarks',
        { sermonId, sermonSlug }
      );
      if (result.success && result.data?.bookmark) {
        setBookmarked(true);
        setBookmarkId(result.data.bookmark.id);
      }
    }
    setLoading(false);
  }

  return (
    <Button
      type="button"
      variant={bookmarked ? 'secondary' : 'outline'}
      size="sm"
      disabled={loading}
      onClick={() => void toggle()}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this sermon'}
    >
      <Bookmark className={`mr-2 size-4 ${bookmarked ? 'fill-current' : ''}`} />
      {bookmarked ? 'Saved' : 'Save'}
    </Button>
  );
}
