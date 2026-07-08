import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getHandoffConversations, getInactiveConversations, markHandoffComplete, recordFollowUp, getFollowUpMessage, getHandoffMessage } from '@/lib/follow-up'
import { sendMessage } from '@/lib/whatsapp'

export async function GET() {
  try {
    const handoffs = await getHandoffConversations()
    const inactive = await getInactiveConversations(2)

    return NextResponse.json({
      handoffs: handoffs.map(h => ({
        phone: h.phone,
        name: h.name,
        lastActive: h.lastActive,
        handoffNote: h.handoffNote,
        followUpCount: h.followUpCount,
      })),
      inactive: inactive.map(i => ({
        phone: i.phone,
        name: i.name,
        lastActive: i.lastActive,
        followUpCount: i.followUpCount,
      })),
    })
  } catch (error: any) {
    console.error('[FollowUp] GET error:', error)
    return NextResponse.json({ handoffs: [], inactive: [] })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')
    if (!phone) return NextResponse.json({ error: 'Phone required' }, { status: 400 })

    await prisma.conversation.update({
      where: { phone },
      data: { followUpCount: 99 },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[FollowUp] DELETE error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const { phone, type } = data

    if (!phone) {
      return NextResponse.json({ error: 'Phone required' }, { status: 400 })
    }

    if (type === 'handoff_complete') {
      await markHandoffComplete(phone)
      return NextResponse.json({ success: true, message: 'Handoff marked complete' })
    }

    if (type === 'send_followup') {
      const conv = await prisma.conversation.findUnique({ where: { phone } })
      if (!conv) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      }

      // Check rate limit (max 3 follow-ups)
      if (conv.followUpCount >= 3) {
        return NextResponse.json({ error: 'Max follow-ups reached for this conversation' }, { status: 400 })
      }

      let message: string
      if (conv.needsHandoff) {
        message = getHandoffMessage()
      } else {
        message = getFollowUpMessage(conv.followUpCount)
      }

      // Try to send via WhatsApp
      let sent = false
      try {
        await sendMessage(phone, message)
        sent = true
        console.log(`[FollowUp] Sent to ${phone}: ${message.substring(0, 50)}...`)
      } catch (e) {
        console.log(`[FollowUp] WhatsApp send failed for ${phone}:`, e)
      }

      // Store the follow-up message
      try {
        await prisma.chatMessage.create({
          data: {
            conversationId: conv.id,
            role: 'assistant',
            content: message,
          },
        })
      } catch (e) {
        console.log('[FollowUp] Could not store message:', e)
      }

      await recordFollowUp(phone, message)
      await prisma.conversation.update({
        where: { phone },
        data: { lastMessage: message },
      })

      return NextResponse.json({
        success: true,
        sent,
        message,
        phone,
        type: conv.needsHandoff ? 'handoff' : 'followup',
      })
    }

    if (type === 'send_bulk_followup') {
      const inactive = await getInactiveConversations(2)
      const results = []

      for (const conv of inactive.slice(0, 10)) {
        if (conv.followUpCount >= 3) continue

        const message = getFollowUpMessage(conv.followUpCount)
        let sent = false
        try {
          await sendMessage(conv.phone, message)
          sent = true
        } catch (e) {}

        try {
          await prisma.chatMessage.create({
            data: {
              conversationId: conv.id,
              role: 'assistant',
              content: message,
            },
          })
        } catch (e) {}

        await recordFollowUp(conv.phone, message)
        await prisma.conversation.update({
          where: { phone: conv.phone },
          data: { lastMessage: message },
        })

        results.push({ phone: conv.phone, sent, message })
      }

      return NextResponse.json({ success: true, sent: results.length, results })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error: any) {
    console.error('[FollowUp] POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
