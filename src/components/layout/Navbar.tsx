'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Church, Menu } from 'lucide-react';

import { cn } from '@/lib/utils';
import { churchConfig, navLinks } from '@/config/church';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-secondary/30 bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo / Church Name */}
        <Link
          href="/"
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <Church className="size-6 text-primary" />
          <span className="hidden text-lg font-bold text-foreground sm:inline-block">
            {churchConfig.branding.name}
          </span>
          <span className="text-lg font-bold text-foreground sm:hidden">
            BME Church
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-1 lg:flex">
          {navLinks.slice(0, -1).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                isActive(link.href)
                  ? 'font-medium text-primary'
                  : 'text-muted-foreground'
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop Right Side */}
        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/contact"
            className={cn(
              'rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
              isActive('/contact')
                ? 'font-medium text-primary'
                : 'text-muted-foreground'
            )}
          >
            Contact
          </Link>
          <Button asChild size="sm">
            <Link href="/contact">Visit Us</Link>
          </Button>
        </div>

        {/* Mobile Menu */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 text-primary">
                <Church className="size-5" />
                {churchConfig.branding.name}
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4">
              {navLinks.map((link) => (
                <SheetClose asChild key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      'rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                      isActive(link.href)
                        ? 'font-medium text-primary bg-primary/5'
                        : 'text-muted-foreground'
                    )}
                  >
                    {link.label}
                  </Link>
                </SheetClose>
              ))}
            </nav>
            <div className="mt-auto px-4 pb-4">
              <SheetClose asChild>
                <Button asChild className="w-full">
                  <Link href="/contact">Visit Us</Link>
                </Button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}
