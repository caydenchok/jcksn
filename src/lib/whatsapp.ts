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

const ALL_COMMANDS = [
  { id: 'talk', name: '/talk', desc: 'Talk to agent directly' },
  { id: 'booking', name: '/booking', desc: 'Book a viewing' },
  { id: 'property', name: '/property', desc: 'View all properties' },
  { id: 'rent', name: '/rent', desc: 'Rental properties' },
  { id: 'buy', name: '/buy', desc: 'Properties for sale' },
  { id: 'new', name: '/new', desc: 'Latest listings' },
  { id: 'price', name: '/price', desc: 'View by price' },
  { id: 'search', name: '/search', desc: 'Search tips' },
  { id: 'agent', name: '/agent', desc: 'Agent info' },
  { id: 'contact', name: '/contact', desc: 'Contact details' },
  { id: 'help', name: '/help', desc: 'Show all commands' },
]

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
    for (const msg of messages) {
      const fromMe = msg.key.fromMe
      const jid = msg.key.remoteJid || ''
      const isPersonal = jid.endsWith('@s.whatsapp.net') || jid.endsWith('@lid')
      if (!fromMe && isPersonal) {
        await processMessage(msg)
      }
    }
  })
}

async function processMessage(msg: any) {
  try {
    const jid = msg.key.remoteJid || ''
    const phone = jid.replace('@s.whatsapp.net', '').replace('@lid', '')
    const content = getMessageContent(msg)
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
  const agent = await prisma.agentProfile.findFirst()
  const agentName = agent?.name || 'JCKSN'

  // Get enabled commands
  let enabledCmds: string[] = ['talk', 'booking', 'property', 'rent', 'buy', 'new', 'price', 'search', 'agent', 'contact', 'help']
  try {
    if (agent?.enabledCommands) {
      enabledCmds = JSON.parse(agent.enabledCommands)
    }
  } catch {}

  // Greetings - show welcome + commands
  const greetings = ['hi', 'hello', 'hey', 'hai', 'helo', 'sup', 'yo', 'hiya', 'good morning', 'good afternoon', 'good evening', 'pagi', 'selamat', 'hey there']
  if (greetings.some(g => cmd.startsWith(g) || cmd === g)) {
    const welcomeMsg = agent?.welcomeMsg || `Hi! I'm ${agentName}, your property assistant. How can I help you today?`
    const cmdList = enabledCmds.map(c => {
      const found = ALL_COMMANDS.find(ac => ac.id === c)
      return found ? `/${found.name.replace('/', '')} - ${found.desc}` : null
    }).filter(Boolean).join('\n')
    return `${welcomeMsg}\n\n📋 *Type these commands:*\n\n${cmdList}`
  }

  // /help - show all commands
  if (cmd === '/help' || cmd === 'help' || cmd === '?') {
    const cmdList = enabledCmds.map(c => {
      const found = ALL_COMMANDS.find(ac => ac.id === c)
      return found ? `/${found.name.replace('/', '')} - ${found.desc}` : null
    }).filter(Boolean).join('\n')
    return `📋 *All Available Commands*\n\n${cmdList}\n\n💡 Or just chat naturally!\nExample: "condo in KL under RM500k"`
  }

  // Check if command is enabled
  const cmdId = cmd.replace('/', '')
  if (!enabledCmds.includes(cmdId) && cmd.startsWith('/')) {
    return `This command is currently disabled. Type /help to see available commands.`
  }

  // /talk - talk to agent directly
  if (cmd === '/talk' || cmd === '/talk to ' + agentName.toLowerCase() || cmd.startsWith('/talk to')) {
    if (agent?.phone) {
      return `💬 *Talk to ${agentName}*\n\n📱 Call/WhatsApp: ${agent.phone}\n${agent.company ? `🏢 ${agent.company}\n` : ''}\nOr just type your question below and I'll help you!`
    }
    return `💬 *Talk to ${agentName}*\n\nContact information not available. Just type your question below!`
  }

  // /booking - book a viewing
  if (cmd === '/booking' || cmd === '/book') {
    return `📅 *Book a Viewing*\n\nTo book a property viewing, please provide:\n\n1️⃣ Your name\n2️⃣ Your phone number\n3️⃣ Property you want to view\n4️⃣ Preferred date and time\n\nExample:\n"I want to view the condo in KLCC on Saturday at 2pm"\n\nOr just tell me what you're looking for!`
  }

  // /property or /list - show all properties
  if (cmd === '/property' || cmd === '/list' || cmd === '/properties') {
    const properties = await prisma.property.findMany({
      where: { status: 'available' },
      take: 10,
      orderBy: { createdAt: 'desc' },
    })

    if (properties.length === 0) return 'No properties available at the moment. Check back soon!'

    let response = '🏠 *All Available Properties*\n\n'
    properties.forEach((p, i) => {
      response += `${i + 1}. *${p.title}*\n`
      response += `   📍 ${p.location}\n`
      response += `   💰 RM ${p.price.toLocaleString()}\n`
      response += `   🛏️ ${p.bedrooms}BR/${p.bathrooms}BA | ${p.size}sqft\n`
      response += `   📋 ${p.propertyType} | ${p.tenure}\n\n`
    })
    response += '💡 Reply with number for details, or /help for commands.'
    return response
  }

  // /rent - rental properties
  if (cmd === '/rent' || cmd === '/sewa') {
    const properties = await prisma.property.findMany({
      where: { status: 'available', propertyCategory: 'rent' },
      take: 10,
      orderBy: { createdAt: 'desc' },
    })
    if (properties.length === 0) return 'No rental properties available at the moment.'

    let response = '🏠 *Rental Properties*\n\n'
    properties.forEach((p, i) => {
      response += `${i + 1}. *${p.title}*\n   📍 ${p.location} | 💰 RM ${p.price.toLocaleString()}/mo\n   🛏️ ${p.bedrooms}BR/${p.bathrooms}BA | ${p.size}sqft\n\n`
    })
    return response
  }

  // /buy - buy properties
  if (cmd === '/buy' || cmd === '/beli') {
    const properties = await prisma.property.findMany({
      where: { status: 'available', propertyCategory: 'buy' },
      take: 10,
      orderBy: { createdAt: 'desc' },
    })
    if (properties.length === 0) return 'No properties for sale at the moment.'

    let response = '🏠 *Properties For Sale*\n\n'
    properties.forEach((p, i) => {
      response += `${i + 1}. *${p.title}*\n   📍 ${p.location} | 💰 RM ${p.price.toLocaleString()}\n   🛏️ ${p.bedrooms}BR/${p.bathrooms}BA | ${p.size}sqft\n\n`
    })
    return response
  }

  // /new - latest listings
  if (cmd === '/new' || cmd === '/baru') {
    const properties = await prisma.property.findMany({
      where: { status: 'available' },
      take: 5,
      orderBy: { createdAt: 'desc' },
    })
    if (properties.length === 0) return 'No new listings yet.'

    let response = '🆕 *Latest Listings*\n\n'
    properties.forEach((p, i) => {
      response += `${i + 1}. *${p.title}*\n   📍 ${p.location} | 💰 RM ${p.price.toLocaleString()}\n   📅 ${new Date(p.createdAt).toLocaleDateString()}\n\n`
    })
    return response
  }

  // /price - view by price
  if (cmd === '/price' || cmd === '/harga') {
    const properties = await prisma.property.findMany({
      where: { status: 'available' },
      take: 10,
      orderBy: { price: 'asc' },
    })
    if (properties.length === 0) return 'No properties available.'

    let response = '💰 *Properties by Price*\n\n'
    properties.forEach((p, i) => {
      response += `${i + 1}. *RM ${p.price.toLocaleString()}* - ${p.title}\n   📍 ${p.location} | 🛏️ ${p.bedrooms}BR\n\n`
    })
    return response
  }

  // /agent - agent info
  if (cmd === '/agent' || cmd === '/profile') {
    if (agent) {
      return `👤 *${agent.name}*
${agent.company ? `🏢 ${agent.company}\n` : ''}
${agent.phone ? `📱 ${agent.phone}\n` : ''}
${agent.email ? `📧 ${agent.email}\n` : ''}
${agent.tagline ? `\n💬 ${agent.tagline}` : ''}
${agent.specialities ? `\n🏆 Specialities: ${agent.specialities}` : ''}`
    }
    return 'Agent information not available.'
  }

  // /contact - contact details
  if (cmd === '/contact' || cmd === '/hubungi') {
    if (agent) {
      return `📞 *Contact ${agent.name}*\n\n📱 Phone: ${agent.phone || 'Not available'}\n${agent.email ? `📧 Email: ${agent.email}\n` : ''}${agent.company ? `🏢 ${agent.company}\n` : ''}\n💡 Or just type your question below!`
    }
    return 'Contact information not available.'
  }

  // /search - search properties
  if (cmd === '/search' || cmd === '/cari') {
    return '🔍 *Search Properties*\n\nJust type what you\'re looking for:\n• "condo in KL"\n• "3 bedroom house"\n• "semi-d under RM1M"\n• "rent in Bangsar"\n\nExample: "I want condo in KLCC under RM800k"'
  }

  // Not a command
  return null
}

export async function sendMessage(phone: string, text: string) {
  if (!sock) throw new Error('WhatsApp not connected')
  // Handle both phone numbers and LIDs
  let jid = phone
  if (!phone.includes('@')) {
    jid = `${phone}@s.whatsapp.net`
  }
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
