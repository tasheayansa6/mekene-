'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Church, Menu, X, LogIn, HandHeart } from 'lucide-react';

import { cn } from '@/lib/utils';
import { churchConfig, navLinks } from '@/config/church';
import { Button } from '@/components/ui/button';

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Mobile menu closes via onClick handlers on each Link

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-300',
        scrolled
          ? 'border-b border-border/50 bg-background/90 shadow-sm backdrop-blur-lg'
          : 'bg-background/60 backdrop-blur-md'
      )}
    >
      <nav
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        aria-label="Main navigation"
      >
        {/* Logo / Church Name */}
        <Link
          href="/"
          className="focus-ring flex items-center gap-2.5 rounded-md transition-opacity hover:opacity-80"
          aria-label={`${churchConfig.branding.name} - Home`}
        >
          <Church className="size-6 text-primary" aria-hidden="true" />
          <div className="hidden flex-col sm:flex">
            <span className="text-sm font-bold leading-tight text-foreground">
              {churchConfig.branding.name}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Ethiopian Orthodox Church
            </span>
          </div>
          <span className="text-sm font-bold text-foreground sm:hidden">
            BME Church
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-0.5 lg:flex" role="menubar">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              role="menuitem"
              className={cn(
                'focus-ring relative rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive(link.href)
                  ? 'text-primary'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              )}
            >
              {link.label}
              {isActive(link.href) && (
                <span className="absolute bottom-0.5 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-primary" />
              )}
            </Link>
          ))}
        </div>

        {/* Desktop Right Side */}
        <div className="hidden items-center gap-2 lg:flex">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-muted-foreground hover:text-foreground"
          >
            <Link href="/login">
              <LogIn className="mr-1.5 size-4" />
              Login
            </Link>
          </Button>
          <Button size="sm" asChild className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
            <Link href="/giving">
              <HandHeart className="mr-1.5 size-4" />
              Give
            </Link>
          </Button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="focus-ring inline-flex items-center justify-center rounded-md p-2 text-foreground transition-colors hover:bg-accent lg:hidden"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {/* Mobile Menu Panel */}
      <div
        id="mobile-nav"
        className={cn(
          'overflow-hidden border-t border-border/50 bg-background transition-all duration-300 ease-in-out lg:hidden',
          mobileOpen ? 'max-h-[calc(100vh-4rem)] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <nav className="mx-auto max-w-7xl space-y-1 px-4 py-4" aria-label="Mobile navigation">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'focus-ring flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive(link.href)
                  ? 'bg-primary/5 text-primary'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-4 flex flex-col gap-2 border-t border-border/50 pt-4">
            <Button
              variant="outline"
              asChild
              className="w-full justify-center"
              onClick={() => setMobileOpen(false)}
            >
              <Link href="/login">
                <LogIn className="mr-2 size-4" />
                Login
              </Link>
            </Button>
            <Button
              asChild
              className="w-full justify-center bg-secondary text-secondary-foreground hover:bg-secondary/90"
              onClick={() => setMobileOpen(false)}
            >
              <Link href="/giving">
                <HandHeart className="mr-2 size-4" />
                Give Now
              </Link>
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
