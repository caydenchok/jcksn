import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // Check bot status from database
    const setting = await prisma.setting.findUnique({ where: { key: 'bot_enabled' } })
    const status = setting?.value === 'false' ? 'off' : 'on'
    return NextResponse.json({ status })
  } catch {
    return NextResponse.json({ status: 'on' })
  }
}

export async function POST(request: Request) {
  try {
    const { action } = await request.json()
    const status = action === 'on' ? 'on' : 'off'
    
    // Save to database
    await prisma.setting.upsert({
      where: { key: 'bot_enabled' },
      update: { value: status },
      create: { key: 'bot_enabled', value: status },
    })
    
    // Also update in-memory variable for immediate effect
    const { setBotEnabled } = await import('@/lib/whatsapp')
    setBotEnabled(status === 'on')
    
    console.log(`[Bot Toggle] Bot ${status === 'on' ? 'ENABLED' : 'DISABLED'} by user`)
    
    return NextResponse.json({ 
      status,
      message: status === 'on' ? 'Bot is now ON - AI will respond to messages' : 'Bot is now OFF - you reply manually'
    })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
