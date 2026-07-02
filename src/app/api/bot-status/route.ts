import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'bot_enabled' } })
    const status = setting?.value === 'false' ? 'off' : 'on'
    return NextResponse.json({ status })
  } catch {
    return NextResponse.json({ status: 'on' })
  }
}
