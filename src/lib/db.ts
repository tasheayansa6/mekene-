import './db-env'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaPhase33?: boolean
}

function createPrismaClient() {
  return new PrismaClient({
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
