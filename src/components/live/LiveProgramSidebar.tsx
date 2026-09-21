import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface LiveProgramItem {
  id: string;
  title: string;
  itemType?: string | null;
  description?: string | null;
  durationMinutes?: number | null;
  responsibleLabel?: string | null;
  isCurrent?: boolean;
}

export function LiveProgramSidebar({
  title,
  notes,
  items,
  currentProgramItemId,
  announcements,
  className,
}: {
  title?: string | null;
  notes?: string | null;
  items: LiveProgramItem[];
  currentProgramItemId?: string | null;
  announcements?: Array<{ id: string; body: string; isPinned: boolean; createdAt: Date | string }>;
  className?: string;
}) {
  const hasProgram = items.length > 0;
  const hasAnnouncements = announcements && announcements.length > 0;

  if (!hasProgram && !hasAnnouncements) return null;

  return (
    <aside className={cn('space-y-4', className)}>
      {hasAnnouncements ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Announcements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {announcements!.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'rounded-md border p-3 text-sm',
                  item.isPinned && 'border-primary/30 bg-primary/5'
                )}
              >
                {item.isPinned ? (
                  <Badge variant="secondary" className="mb-2">
                    Pinned
                  </Badge>
                ) : null}
                <p>{item.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {hasProgram ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{title || 'Order of service'}</CardTitle>
            {notes ? <p className="text-sm text-muted-foreground">{notes}</p> : null}
          </CardHeader>
          <CardContent>
            <ol className="space-y-2" aria-label="Service program">
              {items.map((item, index) => {
                const isCurrent = item.isCurrent || item.id === currentProgramItemId;
                return (
                  <li
                    key={item.id}
                    className={cn(
                      'rounded-md border px-3 py-2 text-sm transition-colors',
                      isCurrent && 'border-primary bg-primary/10 font-medium'
                    )}
                    aria-current={isCurrent ? 'step' : undefined}
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 text-muted-foreground tabular-nums">{index + 1}.</span>
                      <div className="min-w-0 flex-1">
                        <p>{item.title}</p>
                        {item.responsibleLabel ? (
                          <p className="text-xs text-muted-foreground">{item.responsibleLabel}</p>
                        ) : null}
                        {item.durationMinutes ? (
                          <p className="text-xs text-muted-foreground">{item.durationMinutes} min</p>
                        ) : null}
                      </div>
                      {isCurrent ? (
                        <Badge variant="default" className="shrink-0">
                          Now
                        </Badge>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      ) : null}
    </aside>
  );
}
