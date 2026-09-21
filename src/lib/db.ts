import './db-env'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaPhase33?: boolean
}

function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim() || 'file:./build.db'
  // Keep process.env in sync so schema env("DATABASE_URL") resolution never fails
  // in Next.js build workers that do not inherit shell exports.
  process.env.DATABASE_URL = url
  return url
}

function createPrismaClient() {
  return new PrismaClient({
    datasourceUrl: resolveDatabaseUrl(),
    log: process.env.NODE_ENV === 'production' ? undefined : ['query'],
  })
}

function clientHasPhase33(client: PrismaClient): boolean {
  const c = client as PrismaClient & {
    volunteerRole?: unknown
    volunteerSubstitution?: unknown
    volunteerMinistryRequirement?: unknown
    ministryDepartment?: unknown
    volunteerOnboardingTemplate?: unknown
  }
  return Boolean(
    c.volunteerRole &&
      c.volunteerSubstitution &&
      c.volunteerMinistryRequirement &&
      c.ministryDepartment &&
      c.volunteerOnboardingTemplate
  )
}

function getPrismaClient(): PrismaClient {
  const existing = globalForPrisma.prisma
  if (existing && clientHasPhase33(existing) && globalForPrisma.prismaPhase33) {
    return existing
  }
  if (existing && !clientHasPhase33(existing)) {
    void existing.$disconnect().catch(() => undefined)
  }
  const client = createPrismaClient()
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client
    globalForPrisma.prismaPhase33 = clientHasPhase33(client)
  }
  return client
}

export const db = getPrismaClient()
