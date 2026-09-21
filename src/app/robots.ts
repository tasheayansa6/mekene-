import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/member/', '/api/', '/login', '/register', '/profile'],
    },
    sitemap: 'https://busamekeneeyasus.org/sitemap.xml',
  };
}
