import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HeroProps {
  title: string;
  subtitle?: string;
  description?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  imageUrl?: string;
  overlay?: 'dark' | 'light' | 'gradient';
  variant?: 'full' | 'compact';
  children?: React.ReactNode;
}

export function Hero({
  title,
  subtitle,
  description,
  primaryCta,
  secondaryCta,
  imageUrl,
  overlay = 'gradient',
  variant = 'full',
  children,
}: HeroProps) {
  const overlayStyles = {
    dark: 'bg-black/50',
    light: 'bg-white/20',
    gradient: 'bg-gradient-to-r from-primary/90 to-primary/60',
  };

  const variantStyles = {
    full: 'py-32 md:py-40 lg:py-48',
    compact: 'py-20 md:py-28',
  };

  return (
    <section
      className={cn(
        'relative overflow-hidden',
        imageUrl ? 'text-white' : 'bg-primary text-primary-foreground',
        variantStyles[variant]
      )}
    >
      {/* Background Image */}
      {imageUrl && (
        <div className="absolute inset-0">
          <Image
            src={imageUrl}
            alt=""
            fill
            className="object-cover"
            priority
          />
          {/* Overlay */}
          <div className={cn('absolute inset-0', overlayStyles[overlay])} />
        </div>
      )}

      {/* Ethiopian Cross Pattern */}
      <div className="ethiopian-cross-pattern absolute inset-0 opacity-20" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Subtitle */}
          {subtitle && (
            <p className="mb-4 text-sm font-medium uppercase tracking-widest opacity-90">
              {subtitle}
            </p>
          )}

          {/* Gold Accent Line */}
          {subtitle && (
            <div className="gold-accent-line mx-auto mb-6 w-48" />
          )}

          {/* Title */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            {title}
          </h1>

          {/* Description */}
          {description && (
            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed opacity-90">
              {description}
            </p>
          )}

          {/* CTAs */}
          {(primaryCta || secondaryCta) && (
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              {primaryCta && (
                <Button asChild size="lg" variant="secondary">
                  <Link href={primaryCta.href}>
                    {primaryCta.label}
                    <ArrowRight className="ml-1 size-4" />
                  </Link>
                </Button>
              )}
              {secondaryCta && (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-current text-current hover:bg-white/10 hover:text-current"
                >
                  <Link href={secondaryCta.href}>
                    {secondaryCta.label}
                  </Link>
                </Button>
              )}
            </div>
          )}

          {/* Children */}
          {children}
        </div>
      </div>
    </section>
  );
}
