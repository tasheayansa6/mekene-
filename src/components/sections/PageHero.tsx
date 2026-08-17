interface PageHeroProps {
  title: string;
  subtitle?: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export function PageHero({ title, subtitle, description, breadcrumbs }: PageHeroProps) {
  return (
    <section className="bg-primary py-16 md:py-20">
      <div className="ethiopian-cross-pattern absolute inset-0 opacity-20" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex flex-wrap items-center gap-1.5 text-sm text-primary-foreground/60">
              {breadcrumbs.map((crumb, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span aria-hidden="true">/</span>}
                  {crumb.href ? (
                    <a
                      href={crumb.href}
                      className="transition-colors hover:text-primary-foreground"
                    >
                      {crumb.label}
                    </a>
                  ) : (
                    <span className="text-primary-foreground">{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="mx-auto max-w-3xl text-center">
          {subtitle && (
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-primary-foreground/80">
              {subtitle}
            </p>
          )}
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            {title}
          </h1>
          {description && (
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-primary-foreground/80">
              {description}
            </p>
          )}
          <div className="gold-accent-line mx-auto mt-6 w-32" />
        </div>
      </div>
    </section>
  );
}
