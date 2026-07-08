import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import fs from 'fs'
import path from 'path'

export async function POST() {
  try {
    const properties = await prisma.property.findMany({
      orderBy: { createdAt: 'desc' },
    })

    const agent = await prisma.agentProfile.findFirst()

    const dataDir = path.join(process.cwd(), 'public', 'data')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    fs.writeFileSync(
      path.join(dataDir, 'properties.json'),
      JSON.stringify(properties, null, 2),
    )
    fs.writeFileSync(
      path.join(dataDir, 'agent.json'),
      JSON.stringify(agent),
    )

    return NextResponse.json({
      success: true,
      properties: properties.length,
      agent: !!agent,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
