import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  getContentType,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import path from 'path'
import fs from 'fs'
import { prisma } from '@/lib/db'
import { handleIncomingMessage } from './ai'

let sock: ReturnType<typeof makeWASocket> | null = null
let qrCode: string | null = null
let connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected'

const AUTH_DIR = path.join(process.cwd(), 'whatsapp-auth')

export function getConnectionStatus() {
  return { status: connectionStatus, qr: qrCode }
}

function clearAuth() {
  try {
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true })
      console.log('[WA] Auth directory cleared')
    }
  } catch (e) {
    console.error('[WA] Error clearing auth:', e)
  }
}

export async function startWhatsApp() {
  // Only clear auth if explicitly requested (not on normal reconnects)
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true })
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
  const { version } = await fetchLatestBaileysVersion()

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: ['JCKSN WhatsApp', 'Chrome', '3.0'],
  })

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      qrCode = qr
      connectionStatus = 'connecting'
      console.log('[WA] QR code ready')
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
      console.log(`[WA] Closed. Code: ${statusCode}`)

      // 440 or 401 = auth invalid/session replaced - clear auth, show QR
      if (statusCode === 440 || statusCode === 401 || statusCode === DisconnectReason.loggedOut) {
        console.log('[WA] Auth invalid. Clearing and showing QR...')
        connectionStatus = 'connecting'
        qrCode = null
        clearAuth()
        // Restart to get fresh QR
        setTimeout(() => startWhatsApp(), 1000)
        return
      }

      // 515 = restart required after pairing - just reconnect
      connectionStatus = 'disconnected'
      qrCode = null
      setTimeout(() => startWhatsApp(), 2000)

    } else if (connection === 'open') {
      connectionStatus = 'connected'
      qrCode = null
      console.log('[WA] Connected!')
    }
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    console.log(`[WA] messages.upsert event: type=${type}, count=${messages.length}`)
    for (const msg of messages) {
      const fromMe = msg.key.fromMe
      const jid = msg.key.remoteJid
      console.log(`[WA] Message - fromMe: ${fromMe}, jid: ${jid}, type: ${msg.message?.conversation ? 'text' : 'other'}`)
      if (!fromMe && jid?.endsWith('@s.whatsapp.net')) {
        console.log(`[WA] Processing message from ${jid}`)
        await processMessage(msg)
      }
    }
  })
}

async function processMessage(msg: any) {
  try {
    const phone = msg.key.remoteJid!.replace('@s.whatsapp.net', '')
    const content = getMessageContent(msg)
    console.log(`[MSG] From: ${phone}, Content: ${content}`)
    if (!content) return

    // Check for commands first
    const commandResponse = await handleCommand(phone, content)
    if (commandResponse) {
      const conversation = await prisma.conversation.upsert({
        where: { phone },
        create: { phone, lastMessage: content, messages: { create: { role: 'customer', content } } },
        update: { lastMessage: content, lastActive: new Date(), messages: { create: { role: 'customer', content } } },
      })

      await prisma.chatMessage.create({
        data: { conversationId: conversation.id, role: 'ai', content: commandResponse },
      })

      if (sock) {
        await sock.sendMessage(msg.key.remoteJid!, { text: commandResponse })
        console.log(`[WA] Sent command response to ${phone}`)
      }
      return
    }

    // Regular AI flow
    const conversation = await prisma.conversation.upsert({
      where: { phone },
      create: {
        phone,
        lastMessage: content,
        messages: {
          create: { role: 'customer', content },
        },
      },
      update: {
        lastMessage: content,
        lastActive: new Date(),
        messages: {
          create: { role: 'customer', content },
        },
      },
    })

    const aiReply = await handleIncomingMessage(phone, content)

    await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'ai',
        content: aiReply.text,
      },
    })

    await prisma.conversation.update({
      where: { phone },
      data: { lastMessage: aiReply.text },
    })

    if (aiReply.text && sock) {
      await sock.sendMessage(msg.key.remoteJid!, { text: aiReply.text })
    }

    if (aiReply.images && aiReply.images.length > 0 && sock) {
      for (const imagePath of aiReply.images) {
        try {
          const fullPath = path.join(process.cwd(), 'public', imagePath)
          if (fs.existsSync(fullPath)) {
            const imageBuffer = fs.readFileSync(fullPath)
            await sock.sendMessage(msg.key.remoteJid!, {
              image: imageBuffer,
              caption: '',
            })
          }
        } catch (imgErr) {
          console.error('Error sending image:', imgErr)
        }
      }
    }

    // Auto-create booking if AI detected booking intent
    if (aiReply.intent === 'booking_viewing' || aiReply.intent === 'booking_callback') {
      try {
        const parsed = JSON.parse(aiReply.text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/, '$1') || '{}')
        if (parsed.customerName && parsed.customerPhone) {
          await prisma.booking.create({
            data: {
              customerName: parsed.customerName,
              customerPhone: parsed.customerPhone || phone,
              propertyId: parsed.propertyId || 1,
              bookingType: aiReply.intent === 'booking_viewing' ? 'viewing' : 'callback',
              date: parsed.date || new Date().toISOString().split('T')[0],
              time: parsed.time || 'TBD',
              status: 'pending',
              notes: `Auto-created from WhatsApp conversation with ${phone}`,
            },
          })
        }
      } catch (bookingErr) {
        // Booking creation is best-effort
      }
    }
  } catch (error) {
    console.error('Error processing message:', error)
  }
}

function getMessageContent(msg: any): string | null {
  const type = getContentType(msg.message)
  if (!type) return null

  if (type === 'conversation') return msg.message.conversation
  if (type === 'extendedTextMessage') return msg.message.extendedTextMessage?.text
  if (type === 'imageMessage') return msg.message.imageMessage?.caption || '[Image]'
  if (type === 'videoMessage') return msg.message.videoMessage?.caption || '[Video]'
  if (type === 'documentMessage') return msg.message.documentMessage?.fileName || '[Document]'

  return null
}

async function handleCommand(phone: string, content: string): Promise<string | null> {
  const cmd = content.toLowerCase().trim()
  console.log(`[CMD] Checking command: "${cmd}"`)

  // /property or /list - show all properties
  if (cmd === '/property' || cmd === '/list' || cmd === '/properties') {
    console.log('[CMD] Matched /property command')
    const properties = await prisma.property.findMany({
      where: { status: 'available' },
      take: 10,
      orderBy: { createdAt: 'desc' },
    })

    if (properties.length === 0) {
      return 'No properties available at the moment. Check back soon!'
    }

    let response = '🏠 *Available Properties*\n\n'
    properties.forEach((p, i) => {
      response += `${i + 1}. *${p.title}*\n`
      response += `   📍 ${p.location}\n`
      response += `   💰 RM ${p.price.toLocaleString()}\n`
      response += `   🛏️ ${p.bedrooms}BR/${p.bathrooms}BA | ${p.size}sqft\n`
      response += `   📋 ${p.propertyType} | ${p.tenure}\n\n`
    })
    response += 'Reply with property number for details, or "help" for commands.'
    return response
  }

  // /help - show available commands
  if (cmd === '/help' || cmd === 'help') {
    console.log('[CMD] Matched /help command')
    return `📋 *Available Commands*

/property - View all available properties
/help - Show this help message

Or just chat naturally! I can help you:
• Find properties by location, budget, or type
• Book property viewings
• Get property details
• Answer your questions

Try: "I want condo in KL under RM500k"`
  }

  // /contact - show agent contact
  if (cmd === '/contact' || cmd === 'contact') {
    const agent = await prisma.agentProfile.findFirst()
    if (agent) {
      return `👤 *${agent.name}*
${agent.company ? `🏢 ${agent.company}\n` : ''}
📱 ${agent.phone}
${agent.email ? `📧 ${agent.email}\n` : ''}
${agent.tagline}`
    }
    return 'Contact information not available.'
  }

  // Not a command
  console.log('[CMD] No command matched, returning null')
  return null
}

export async function sendMessage(phone: string, text: string) {
  if (!sock) throw new Error('WhatsApp not connected')
  const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`
  await sock.sendMessage(jid, { text })
}

export async function disconnectWhatsApp() {
  if (sock) {
    try {
      sock.end(undefined)
    } catch {}
    sock = null
  }
  qrCode = null
  connectionStatus = 'disconnected'
  clearAuth()
  console.log('[WA] Disconnected by user')
}
