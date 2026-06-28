import { PrismaClient } from '@/generated/prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    const adapter = new PrismaLibSql({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
    return new PrismaClient({ adapter })
  }

  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('libsql://')) {
    const adapter = new PrismaLibSql({
      url: process.env.DATABASE_URL,
      authToken: process.env.DATABASE_URL.includes('authToken') ? undefined : process.env.DB_AUTH_TOKEN,
    })
    return new PrismaClient({ adapter })
  }

  const adapter = new PrismaLibSql({
    url: 'file:dev.db',
  })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
