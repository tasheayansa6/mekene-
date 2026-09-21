'use client';

import { useEffect, useState } from 'react';
import { navLinks } from '@/config/church';
import { apiGet } from '@/lib/api/client';

interface NavLinkItem {
  label: string;
  href: string;
}

interface MenuResponse {
  items: Array<{ label: string; href: string; children?: MenuResponse['items'] }>;
}

function flattenMenu(items: MenuResponse['items']): NavLinkItem[] {
  return items.map((item) => ({ label: item.label, href: item.href }));
}

export function useCmsNavLinks(location: 'main' | 'footer' | 'mobile') {
  const fallback = navLinks.map((link) => ({ label: link.label, href: link.href }));
  const [links, setLinks] = useState<NavLinkItem[]>(fallback);

  useEffect(() => {
    void apiGet<MenuResponse>(`/content/menus/${location}`).then((result) => {
      if (result.success && result.data?.items?.length) {
        setLinks(flattenMenu(result.data.items));
      }
    });
  }, [location]);

  return links;
}
