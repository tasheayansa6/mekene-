import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  align?: 'left' | 'center';
  className?: string;
}

export function SectionHeading({
  title,
  description,
  icon: Icon,
  align = 'center',
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        align === 'center' && 'text-center',
        className
      )}
    >
      {/* Icon */}
      {Icon && (
        <div
          className={cn(
            'mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10',
            align === 'left' && 'mx-0'
          )}
        >
          <Icon className="size-6 text-primary" />
        </div>
      )}

      {/* Title */}
      <h2 className="text-3xl font-bold text-primary md:text-4xl">
        {title}
      </h2>

      {/* Gold Accent Line */}
      <div
        className={cn(
          'gold-accent-line mb-4 mt-4',
          align === 'center' ? 'mx-auto w-32' : 'w-16'
        )}
      />

      {/* Description */}
      {description && (
        <p className="mt-4 text-lg text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
