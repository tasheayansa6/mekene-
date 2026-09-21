'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { apiGet } from '@/lib/api/client';

interface SearchHit {
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export function AdminSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    users: SearchHit[];
    ministries: SearchHit[];
    leaders: SearchHit[];
    sermons: SearchHit[];
    events: SearchHit[];
    prayer: SearchHit[];
    gallery: SearchHit[];
    members: SearchHit[];
  }>({ users: [], ministries: [], leaders: [], sermons: [], events: [], prayer: [], gallery: [], members: [] });

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults({ users: [], ministries: [], leaders: [], sermons: [], events: [], prayer: [], gallery: [], members: [] });
      return;
    }
    const handle = window.setTimeout(() => {
      setLoading(true);
      void apiGet<{
        users: SearchHit[];
        ministries: SearchHit[];
        leaders: SearchHit[];
        sermons: SearchHit[];
        events: SearchHit[];
        prayer: SearchHit[];
        gallery: SearchHit[];
        members: SearchHit[];
      }>('/admin/search', { q: query.trim() }).then((result) => {
        setResults(
          result.data || {
            users: [],
            ministries: [],
            leaders: [],
            sermons: [],
            events: [],
            prayer: [],
            gallery: [],
            members: [],
          }
        );
        setLoading(false);
      });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [open, query]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  const empty =
    !loading &&
    query.trim().length >= 2 &&
    results.users.length === 0 &&
    results.ministries.length === 0 &&
    results.leaders.length === 0 &&
    results.sermons.length === 0 &&
    results.events.length === 0 &&
    results.prayer.length === 0 &&
    results.gallery.length === 0 &&
    results.members.length === 0;

  return (
    <>
      <Button
        variant="outline"
        className="h-9 w-9 p-0 md:w-64 md:justify-start md:px-3"
        onClick={() => setOpen(true)}
        aria-label="Search administration"
      >
        <Search className="size-4" />
        <span className="ml-2 hidden text-muted-foreground md:inline">Search…</span>
        <kbd className="pointer-events-none ml-auto hidden rounded border bg-muted px-1.5 text-[10px] md:inline">
          Ctrl K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Admin search" description="Search users, ministries, and leaders">
        <CommandInput
          placeholder="Search users, ministries, leaders"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {query.trim().length < 2 ? (
            <CommandEmpty>Type at least two characters.</CommandEmpty>
          ) : empty ? (
            <CommandEmpty>No matching records.</CommandEmpty>
          ) : (
            <>
              {results.users.length > 0 ? (
                <CommandGroup heading="Users">
                  {results.users.map((item) => (
                    <CommandItem key={item.id} onSelect={() => go(item.href)}>
                      <div className="flex flex-col">
                        <span>{item.title}</span>
                        <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
              {results.ministries.length > 0 ? (
                <CommandGroup heading="Ministries">
                  {results.ministries.map((item) => (
                    <CommandItem key={item.id} onSelect={() => go(item.href)}>
                      <div className="flex flex-col">
                        <span>{item.title}</span>
                        <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
              {results.leaders.length > 0 ? (
                <CommandGroup heading="Leaders">
                  {results.leaders.map((item) => (
                    <CommandItem key={item.id} onSelect={() => go(item.href)}>
                      <div className="flex flex-col">
                        <span>{item.title}</span>
                        <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
              {results.sermons.length > 0 ? (
                <CommandGroup heading="Sermons">
                  {results.sermons.map((item) => (
                    <CommandItem key={item.id} onSelect={() => go(item.href)}>
                      <div className="flex flex-col">
                        <span>{item.title}</span>
                        <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
              {results.events.length > 0 ? (
                <CommandGroup heading="Events">
                  {results.events.map((item) => (
                    <CommandItem key={item.id} onSelect={() => go(item.href)}>
                      <div className="flex flex-col">
                        <span>{item.title}</span>
                        <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
              {results.prayer.length > 0 ? (
                <CommandGroup heading="Prayer">
                  {results.prayer.map((item) => (
                    <CommandItem key={item.id} onSelect={() => go(item.href)}>
                      <div className="flex flex-col">
                        <span>{item.title}</span>
                        <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
              {results.gallery.length > 0 ? (
                <CommandGroup heading="Gallery">
                  {results.gallery.map((item) => (
                    <CommandItem key={item.id} onSelect={() => go(item.href)}>
                      <div className="flex flex-col">
                        <span>{item.title}</span>
                        <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
              {results.members.length > 0 ? (
                <CommandGroup heading="Members">
                  {results.members.map((item) => (
                    <CommandItem key={item.id} onSelect={() => go(item.href)}>
                      <div className="flex flex-col">
                        <span>{item.title}</span>
                        <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
