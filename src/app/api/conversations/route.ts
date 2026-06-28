import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const conversations = await prisma.conversation.findMany({
    include: {
      messages: {
        orderBy: { timestamp: 'asc' },
      },
    },
    orderBy: { lastActive: 'desc' },
  })

  return NextResponse.json(conversations)
}
