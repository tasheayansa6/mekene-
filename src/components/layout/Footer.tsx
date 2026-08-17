import Link from 'next/link';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';

import { cn } from '@/lib/utils';
import { churchConfig, navLinks } from '@/config/church';
import { Container } from '@/components/layout/Container';
import { FooterSocialLinks, FooterServiceTimes } from '@/components/layout/FooterDynamicData';

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { branding, contact } = churchConfig;

  return (
    <footer className="bg-primary text-primary-foreground">
      {/* Gold accent line */}
      <div className="gold-accent-line" />

      <Container>
        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Church Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold">{branding.name}</h3>
            <p className="text-sm leading-relaxed text-primary-foreground/80">
              {branding.description}
            </p>
            {/* Social Links (dynamic from API) */}
            <FooterSocialLinks />
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-secondary">
              Quick Links
            </h4>
            <nav aria-label="Footer navigation">
              <ul className="space-y-2">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Service Times (dynamic from API) */}
          <div>
            <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-secondary">
              <Clock className="size-4" />
              Service Times
            </h4>
            <FooterServiceTimes />
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-secondary">
              Contact Us
            </h4>
            <address className="not-italic space-y-3">
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-2 text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground"
              >
                <Mail className="size-4 shrink-0" />
                {contact.email}
              </a>
              <a
                href={`tel:${contact.phone}`}
                className="flex items-center gap-2 text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground"
              >
                <Phone className="size-4 shrink-0" />
                {contact.phone}
              </a>
              <p className="flex items-start gap-2 text-sm text-primary-foreground/70">
                <MapPin className="mt-0.5 size-4 shrink-0" />
                {contact.address}, {contact.city}, {contact.country}
              </p>
            </address>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-primary-foreground/10 py-6">
          <p className="text-center text-sm text-primary-foreground/60">
            &copy; {currentYear} {branding.name}. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
}