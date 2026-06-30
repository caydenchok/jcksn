import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Get leads that need follow-up
export async function GET() {
  try {
    // Get leads that are "contacted" but haven't been updated in 3+ days
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    const leads = await prisma.lead.findMany({
      where: {
        status: 'contacted',
        phone: { not: '' },
        updatedAt: { lt: threeDaysAgo },
      },
      orderBy: { updatedAt: 'asc' },
      take: 20,
    })

    // Also get conversations that haven't had activity in 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const staleConversations = await prisma.conversation.findMany({
      where: {
        lastActive: { lt: sevenDaysAgo },
        phone: { not: '' },
      },
      orderBy: { lastActive: 'asc' },
      take: 20,
    })

    return NextResponse.json({
      leadsNeedingFollowUp: leads,
      staleConversations: staleConversations,
    })
  } catch (error: any) {
    console.error('Follow-up error:', error)
    return NextResponse.json({ leadsNeedingFollowUp: [], staleConversations: [] })
  }
}

// Send follow-up message
export async function POST(request: Request) {
  try {
    const data = await request.json()

    if (!data.phone || !data.message) {
      return NextResponse.json({ error: 'Phone and message required' }, { status: 400 })
    }

    // Store the follow-up message as a note
    if (data.leadId) {
      await prisma.lead.update({
        where: { id: data.leadId },
        data: {
          notes: `Follow-up sent: ${data.message}\n---\n${data.notes || ''}`,
          updatedAt: new Date(),
        },
      })
    }

    // Log the follow-up attempt
    await prisma.chatMessage.create({
      data: {
        conversationId: 0, // System message
        role: 'system',
        content: `Follow-up to ${data.phone}: ${data.message}`,
      },
    }).catch(() => {}) // Best effort

    return NextResponse.json({
      success: true,
      message: 'Follow-up queued. Will be sent when WhatsApp is connected.',
    })
  } catch (error: any) {
    console.error('Follow-up POST error:', error)
    return NextResponse.json({ error: 'Failed to queue follow-up' }, { status: 500 })
  }
}
