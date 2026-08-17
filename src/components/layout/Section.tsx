import { cn } from '@/lib/utils';
import { Container } from '@/components/layout/Container';

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  variant?: 'default' | 'warm' | 'primary' | 'muted';
}

export function Section({
  children,
  className,
  id,
  variant = 'default',
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        'py-16 md:py-24',
        variant === 'warm' && 'section-warm-bg',
        variant === 'primary' && 'bg-primary text-primary-foreground',
        variant === 'muted' && 'bg-muted',
        className
      )}
    >
      <Container>{children}</Container>
    </section>
  );
}
