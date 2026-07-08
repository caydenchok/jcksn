// Standalone script to export properties + agent for Vercel deployment.
// Usage: node scripts/export-public.mjs
//
// Must be run from project root (where dev.db lives).

import { PrismaClient } from '../src/generated/prisma/client/index.js'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createRequire } from 'module'
import path from 'path'
import fs from 'fs'

const require = createRequire(import.meta.url)

// LibSQL adapter pointing at the local dev.db
const adapter = new PrismaLibSql({ url: 'file:dev.db' })
const prisma = new PrismaClient({ adapter })

async function main() {
  const [properties, agent] = await Promise.all([
    prisma.property.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.agentProfile.findFirst(),
  ])

  const dataDir = path.join(process.cwd(), 'public', 'data')
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

  fs.writeFileSync(path.join(dataDir, 'properties.json'), JSON.stringify(properties, null, 2))
  fs.writeFileSync(path.join(dataDir, 'agent.json'), JSON.stringify(agent))

  console.log(`Exported ${properties.length} properties + agent profile to public/data/`)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
