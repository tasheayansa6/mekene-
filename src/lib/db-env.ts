/**
 * Must load before PrismaClient. Import this first from db.ts.
 * ESM import order is preserved for relative imports listed first.
 */
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./build.db';
}

export const DATABASE_URL = process.env.DATABASE_URL;
