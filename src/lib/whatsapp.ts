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
import {
  getQualificationState,
  startQualification,
  processQualificationStep,
  isQualifying,
  shouldStartQualification,
  QUALIFICATION_STEPS,
} from './lead-qualification'

let sock: ReturnType<typeof makeWASocket> | null = null
let qrCode: string | null = null
let connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected'
let botEnabled = true
// Numbers the bot should never auto-reply to (e.g. friends/family) — the
// agent adds these manually since there's no reliable way to read "is this
// saved as a contact on my phone" through the WhatsApp connection library.
let excludedNumbers = new Set<string>()

// Canonical form for comparing phone numbers regardless of how they were
// typed (with/without +60, leading 0, spaces, dashes) — matches the format
// `phone` is already derived in as (digits only, 60-prefixed, no leading 0).
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('0')) digits = '60' + digits.slice(1)
  else if (!digits.startsWith('60')) digits = '60' + digits
  return digits
}

export function getExcludedNumbers() { return Array.from(excludedNumbers) }
export async function setExcludedNumbers(numbers: string[]) {
  excludedNumbers = new Set(numbers.map(normalizePhone))
  await prisma.setting.upsert({
    where: { key: 'whatsapp_excluded_numbers' },
    update: { value: JSON.stringify(Array.from(excludedNumbers)) },
    create: { key: 'whatsapp_excluded_numbers', value: JSON.stringify(Array.from(excludedNumbers)) },
  })
}
// Socket lifecycle guards. Every (re)start bumps `generation`; event handlers
// and reconnect timers from older sockets check it and no-op. This prevents
// two live sockets fighting over one session (WhatsApp kicks both with
// "conflict: replaced" and the UI flaps connected/disconnected).
let generation = 0
let starting = false
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

export function getBotEnabled() { return botEnabled }
export function setBotEnabled(enabled: boolean) { botEnabled = enabled }

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

function scheduleReconnect(gen: number, delayMs: number) {
  if (reconnectTimer) clearTimeout(reconnectTimer)
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    if (gen === generation) startWhatsApp()
  }, delayMs)
}

export async function startWhatsApp() {
  // Single-flight: ignore calls while a start is in progress or we're live.
  if (starting) return
  if (sock && connectionStatus === 'connected') return
  starting = true
  const gen = ++generation

  try {
    // Load bot status from database
    try {
      const setting = await prisma.setting.findUnique({ where: { key: 'bot_enabled' } })
      botEnabled = setting?.value !== 'false'
      console.log(`[WA] Bot status loaded: ${botEnabled ? 'ON' : 'OFF'}`)
    } catch {}

    // Load excluded (do-not-auto-reply) numbers from database
    try {
      const setting = await prisma.setting.findUnique({ where: { key: 'whatsapp_excluded_numbers' } })
      excludedNumbers = new Set(setting ? JSON.parse(setting.value) : [])
      console.log(`[WA] Excluded numbers loaded: ${excludedNumbers.size}`)
    } catch {}

    // Tear down any previous socket so two sockets never share one session.
    if (sock) {
      try { sock.end(undefined) } catch {}
      sock = null
    }

    // Only clear auth if explicitly requested (not on normal reconnects)
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true })
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
    const { version } = await fetchLatestBaileysVersion()

    const s = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: ['JCKSN WhatsApp', 'Chrome', '3.0'],
    })
    sock = s

    s.ev.on('connection.update', (update) => {
      if (gen !== generation) return // stale socket — a newer one owns the state
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        qrCode = qr
        connectionStatus = 'connecting'
        console.log('[WA] QR code ready')
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
        console.log(`[WA] Closed. Code: ${statusCode}`)
        sock = null

        // 440 or 401 = auth invalid/session replaced - clear auth, show QR
        if (statusCode === 440 || statusCode === 401 || statusCode === DisconnectReason.loggedOut) {
          console.log('[WA] Auth invalid. Clearing and showing QR...')
          connectionStatus = 'connecting'
          qrCode = null
          clearAuth()
          // Restart to get fresh QR
          scheduleReconnect(gen, 1000)
          return
        }

        // 515 = restart required after pairing - just reconnect
        connectionStatus = 'disconnected'
        qrCode = null
        scheduleReconnect(gen, 2000)

      } else if (connection === 'open') {
        connectionStatus = 'connected'
        qrCode = null
        console.log('[WA] Connected!')
      }
    })

    // Wrapped so a stale socket can't crash the process writing creds into a
    // cleared auth dir (ENOENT unhandledRejection).
    s.ev.on('creds.update', async () => {
      if (gen !== generation) return
      try { await saveCreds() } catch (e: any) {
        console.error('[WA] creds save failed:', e?.message)
      }
    })

    s.ev.on('messages.upsert', async ({ messages, type }) => {
      if (gen !== generation) return
      for (const msg of messages) {
        const fromMe = msg.key.fromMe
        const jid = msg.key.remoteJid || ''
        const isPersonal = jid.endsWith('@s.whatsapp.net') || jid.endsWith('@lid')
        if (!fromMe && isPersonal) {
          await processMessage(msg)
        }
      }
    })
  } finally {
    starting = false
  }
}

async function processMessage(msg: any) {
  try {
    const jid = msg.key.remoteJid || ''
    const phone = jid.replace('@s.whatsapp.net', '').replace('@lid', '')
    const content = getMessageContent(msg)
    if (!content) return

    // Excluded numbers (friends/family) — skip entirely, no logging, no
    // reply. The agent replies to these manually like a normal WhatsApp chat.
    if (excludedNumbers.has(normalizePhone(phone))) {
      console.log(`[WA] Skipping excluded number ${phone}`)
      return
    }

    // A scraped lead messaging us IS the verification: the number is real,
    // reachable, and WhatsApp shows us their actual display name (pushName).
    // Runs regardless of the bot on/off toggle — identity confirmation isn't
    // an auto-reply.
    try {
      const unverified = await prisma.lead.findMany({ where: { nameVerified: false } })
      const matched = unverified.find(l => l.phone && normalizePhone(l.phone) === normalizePhone(phone))
      if (matched) {
        await prisma.lead.update({
          where: { id: matched.id },
          data: { nameVerified: true, ...(msg.pushName ? { name: msg.pushName } : {}) },
        })
        console.log(`[WA] Lead #${matched.id} verified — messaged us on WhatsApp${msg.pushName ? ` as "${msg.pushName}"` : ''}`)
      }
    } catch {}

    // Check if bot is enabled - if not, skip AI responses (user replies manually)
    if (!botEnabled) {
      console.log(`[WA] Bot is OFF - skipping AI response for ${phone}`)
      return
    }

    // Check for commands first (always allow commands)
    const commandResponse = await handleCommand(phone, content)
    if (commandResponse) {
      const conversation = await prisma.conversation.upsert({
        where: { phone },
        create: { phone, lastMessage: content, messages: { create: { role: 'customer', content } } },
        update: { lastMessage: content, lastActive: new Date(), messages: { create: { role: 'customer', content } } },
      })

      await prisma.chatMessage.create({
        data: { conversationId: conversation.id, role: 'ai', content: commandResponse.text },
      })

      if (sock) {
        await sock.sendMessage(msg.key.remoteJid!, { text: commandResponse.text })
        console.log(`[WA] Sent command response to ${phone}`)

        if (commandResponse.images && commandResponse.images.length > 0) {
          // Send first 3 images
          const imagesToSend = commandResponse.images.slice(0, 3)
          const hasMore = commandResponse.images.length > 3
          
          for (const imagePath of imagesToSend) {
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
              console.error('Error sending command image:', imgErr)
            }
          }
          
          // If there are more images, ask user
          if (hasMore) {
            const moreMsg = `📸 You've seen ${imagesToSend.length} of ${commandResponse.images.length} photos.\n\nReply "yes" to see all ${commandResponse.images.length} photos.`
            await sock.sendMessage(msg.key.remoteJid!, { text: moreMsg })
          }
        }
      }
      return
    }

    // Check if user is in qualification flow
    const qualState = getQualificationState(phone)
    if (qualState) {
      const result = processQualificationStep(phone, content)
      
      // Save to conversation
      const conversation = await prisma.conversation.upsert({
        where: { phone },
        create: { phone, lastMessage: content, messages: { create: { role: 'customer', content } } },
        update: { lastMessage: content, lastActive: new Date(), messages: { create: { role: 'customer', content } } },
      })

      await prisma.chatMessage.create({
        data: { conversationId: conversation.id, role: 'ai', content: result.response },
      })

      if (sock) {
        await sock.sendMessage(msg.key.remoteJid!, { text: result.response })
        console.log(`[WA] Sent qualification response to ${phone}`)
      }
      return
    }

    // Check if this is a new user who should start qualification
    const messageCount = await prisma.chatMessage.count({
      where: { conversation: { phone } },
    })

    if (shouldStartQualification(phone, messageCount)) {
      // Start qualification flow
      const state = startQualification(phone)
      const firstQuestion = QUALIFICATION_STEPS[0].question

      const conversation = await prisma.conversation.upsert({
        where: { phone },
        create: { phone, lastMessage: content, messages: { create: { role: 'customer', content } } },
        update: { lastMessage: content, lastActive: new Date(), messages: { create: { role: 'customer', content } } },
      })

      await prisma.chatMessage.create({
        data: { conversationId: conversation.id, role: 'ai', content: firstQuestion },
      })

      if (sock) {
        await sock.sendMessage(msg.key.remoteJid!, { text: firstQuestion })
        console.log(`[WA] Started qualification for ${phone}`)
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

    let finalText = aiReply.text
    let finalImages: string[] = aiReply.images || []

    // If AI requested a command, execute it and merge results
    if (aiReply.command) {
      const cmdResult = await handleCommand(phone, aiReply.command)
      if (cmdResult) {
        finalText = aiReply.text + '\n\n' + cmdResult.text
        if (cmdResult.images && cmdResult.images.length > 0) {
          // Deduplicate images before merging
          const newImages = cmdResult.images.filter(img => !finalImages.includes(img))
          finalImages = [...finalImages, ...newImages]
        }
      }
    }

    // Final deduplication of all images
    finalImages = [...new Set(finalImages)]

    await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'ai',
        content: finalText,
      },
    })

    await prisma.conversation.update({
      where: { phone },
      data: { lastMessage: finalText },
    })

    if (finalText && sock) {
      await sock.sendMessage(msg.key.remoteJid!, { text: finalText })
    }

    if (finalImages.length > 0 && sock) {
      // Show first 3 images
      const imagesToShow = finalImages.slice(0, 3)
      const hasMoreImages = finalImages.length > 3
      
      for (const imagePath of imagesToShow) {
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
      
      // If there are more images, ask user if they want to see them
      if (hasMoreImages) {
        const moreImagesMsg = `📸 You've seen ${imagesToShow.length} of ${finalImages.length} photos.\n\nWould you like to see all ${finalImages.length} photos? Reply "yes" to see more.`
        await sock.sendMessage(msg.key.remoteJid!, { text: moreImagesMsg })
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

interface CommandResponse {
  text: string
  images?: string[]
  lastPropertyId?: number
  totalImages?: number
  shownImages?: number
}

const listProps = async (where: any, take: number, orderBy: any) => {
  return prisma.property.findMany({ where, take, orderBy })
}

function formatPropertyDetail(p: any): string {
  let features: string[] = []
  try { features = JSON.parse(p.features || '[]') } catch {}
  return [
    `🏠 *${p.title}*`,
    `📍 ID: ${p.id}`,
    ``,
    `📍 Location: ${p.location}`,
    `💰 Price: RM ${p.price.toLocaleString()}`,
    `📋 Type: ${p.propertyType} | ${p.propertyCategory === 'rent' ? 'For Rent' : 'For Sale'}`,
    `📐 Size: ${p.size}`,
    p.landSize ? `🏡 Land Size: ${p.landSize}` : null,
    `🛏️ Bedrooms: ${p.bedrooms} | 🚿 Bathrooms: ${p.bathrooms}`,
    p.carParks ? `🚗 Car Parks: ${p.carParks}` : null,
    `🏗️ Tenure: ${p.tenure}`,
    `🪑 Furnishing: ${p.furnishing}`,
    `🏢 Lot Type: ${p.lotType}`,
    `📊 Status: ${p.status}`,
    features.length > 0 ? `\n✨ *Features:*\n${features.map((f: string) => `• ${f}`).join('\n')}` : null,
    `\n${p.description ? `📝 *Description:*\n${p.description}` : ''}`,
    `\n📸 Reply with number to see more photos`,
    `   (${getTotalPropertyImages(p) > 3 ? `${getTotalPropertyImages(p)} photos available - showing first 3` : `${getTotalPropertyImages(p)} photo${getTotalPropertyImages(p) !== 1 ? 's' : ''}`})`,
  ].filter(Boolean).join('\n')
}

function getPropertyImages(p: any, maxImages: number = 3): string[] {
  try {
    const imgs = JSON.parse(p.images || '[]')
    return imgs.filter((img: string) => img && img.length > 0).slice(0, maxImages)
  } catch {
    return []
  }
}

function getTotalPropertyImages(p: any): number {
  try {
    const imgs = JSON.parse(p.images || '[]')
    return imgs.filter((img: string) => img && img.length > 0).length
  } catch {
    return 0
  }
}

async function handleCommand(phone: string, content: string): Promise<CommandResponse | null> {
  const cmd = content.toLowerCase().trim()
  const rawCmd = content.trim()
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
    return { text: `${welcomeMsg}\n\n📋 *Type these commands:*\n\n${cmdList}` }
  }

  // /help - show all commands
  if (cmd === '/help' || cmd === 'help' || cmd === '?') {
    const cmdList = enabledCmds.map(c => {
      const found = ALL_COMMANDS.find(ac => ac.id === c)
      return found ? `/${found.name.replace('/', '')} - ${found.desc}` : null
    }).filter(Boolean).join('\n')
    return { text: `📋 *All Available Commands*\n\n${cmdList}\n\n💡 Or just chat naturally!\nExample: "condo in KL under RM500k"` }
  }

  // Check if command is enabled
  const cmdId = cmd.replace('/', '')
  if (!enabledCmds.includes(cmdId) && cmd.startsWith('/')) {
    return { text: `This command is currently disabled. Type /help to see available commands.` }
  }

  // Number selection (e.g. user replies "1" or "/1" to view property details)
  const numMatch = rawCmd.match(/^\/?(\d+)$/)
  if (numMatch) {
    const idx = parseInt(numMatch[1]) - 1
    const properties = await listProps({ status: 'available' }, 10, { createdAt: 'desc' })
    if (idx >= 0 && idx < properties.length) {
      const p = properties[idx]
      const images = getPropertyImages(p, 3)
      const totalImages = getTotalPropertyImages(p)
      return { 
        text: formatPropertyDetail(p), 
        images,
        lastPropertyId: p.id,
        totalImages,
        shownImages: Math.min(3, totalImages)
      }
    }
    return { text: `❌ Invalid number. Please choose 1-${properties.length}.` }
  }

  // Handle "yes" to see more images after viewing property
  if (cmd === 'yes' || cmd === 'more' || cmd === 'show more' || cmd === 'lagi') {
    // Find the last property viewed from conversation history
    const conversation = await prisma.conversation.findUnique({
      where: { phone },
      include: { messages: { orderBy: { timestamp: 'desc' }, take: 5 } },
    })
    
    // Look for property ID in recent messages
    const lastPropMsg = conversation?.messages.find(m => 
      m.content.includes('🏠') && m.content.includes('📍')
    )
    
    if (lastPropMsg) {
      // Extract property ID from the message
      const propIdMatch = lastPropMsg.content.match(/ID:\s*(\d+)/)
      if (propIdMatch) {
        const propId = parseInt(propIdMatch[1])
        const property = await prisma.property.findUnique({ where: { id: propId } })
        if (property) {
          const allImages = getPropertyImages(property, 100) // Get all images
          const firstThree = getPropertyImages(property, 3)
          const remainingImages = allImages.slice(3) // Skip first 3 already shown
          
          if (remainingImages.length > 0) {
            return { 
              text: `📸 Here are the remaining ${remainingImages.length} photos of *${property.title}*:\n\nReply with "1" to go back to property details.`, 
              images: remainingImages,
              lastPropertyId: property.id,
              totalImages: allImages.length,
              shownImages: allImages.length
            }
          } else {
            return { text: `📸 You've already seen all ${allImages.length} photos of this property.` }
          }
        }
      }
    }
    
    return { text: `Which property would you like to see more photos of? Reply with the property number (e.g. 1, 2, 3).` }
  }

  // /talk - talk to agent directly
  if (cmd === '/talk' || cmd === '/talk to ' + agentName.toLowerCase() || cmd.startsWith('/talk to')) {
    if (agent?.phone) {
      return { text: `💬 *Talk to ${agentName}*\n\n📱 Call/WhatsApp: ${agent.phone}\n${agent.company ? `🏢 ${agent.company}\n` : ''}\nOr just type your question below and I'll help you!` }
    }
    return { text: `💬 *Talk to ${agentName}*\n\nContact information not available. Just type your question below!` }
  }

  // /booking - book a viewing
  if (cmd === '/booking' || cmd === '/book') {
    return { text: `📅 *Book a Viewing*\n\nTo book a property viewing, please provide:\n\n1️⃣ Your name\n2️⃣ Your phone number\n3️⃣ Property you want to view\n4️⃣ Preferred date and time\n\nExample:\n"I want to view the condo in KLCC on Saturday at 2pm"\n\nOr just tell me what you're looking for!` }
  }

  // /property or /list - show all properties
  if (cmd === '/property' || cmd === '/list' || cmd === '/properties') {
    const properties = await listProps({ status: 'available' }, 10, { createdAt: 'desc' })
    if (properties.length === 0) return { text: 'No properties available at the moment. Check back soon!' }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    let response = '🏠 *All Available Properties*\n\n'
    properties.forEach((p, i) => {
      const hasImages = (() => { try { return JSON.parse(p.images || '[]').length > 0 } catch { return false } })()
      response += `${i + 1}. *${p.title}*\n`
      response += `   📍 ${p.location}\n`
      response += `   💰 RM ${p.price.toLocaleString()}\n`
      response += `   🛏️ ${p.bedrooms}BR/${p.bathrooms}BA | ${p.size}sqft\n`
      response += `   📋 ${p.propertyType} | ${p.tenure}${hasImages ? ' | 📸' : ''}\n\n`
    })
    response += `💡 Reply with number (e.g. 1) for full details + photos\n\n🌐 Browse all properties: ${appUrl}/p`
    return { text: response }
  }

  // /rent - rental properties
  if (cmd === '/rent' || cmd === '/sewa') {
    const properties = await listProps({ status: 'available', propertyCategory: 'rent' }, 10, { createdAt: 'desc' })
    if (properties.length === 0) return { text: 'No rental properties available at the moment.' }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    let response = '🏠 *Rental Properties*\n\n'
    properties.forEach((p, i) => {
      response += `${i + 1}. *${p.title}*\n   📍 ${p.location} | 💰 RM ${p.price.toLocaleString()}/mo\n   🛏️ ${p.bedrooms}BR/${p.bathrooms}BA | ${p.size}sqft\n\n`
    })
    response += `💡 Reply with number for details + photos\n\n🌐 Browse all rentals: ${appUrl}/p`
    return { text: response }
  }

  // /buy - buy properties
  if (cmd === '/buy' || cmd === '/beli') {
    const properties = await listProps({ status: 'available', propertyCategory: 'buy' }, 10, { createdAt: 'desc' })
    if (properties.length === 0) return { text: 'No properties for sale at the moment.' }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    let response = '🏠 *Properties For Sale*\n\n'
    properties.forEach((p, i) => {
      response += `${i + 1}. *${p.title}*\n   📍 ${p.location} | 💰 RM ${p.price.toLocaleString()}\n   🛏️ ${p.bedrooms}BR/${p.bathrooms}BA | ${p.size}sqft\n\n`
    })
    response += `💡 Reply with number for details + photos\n\n🌐 Browse all properties: ${appUrl}/p`
    return { text: response }
  }

  // /new - latest listings
  if (cmd === '/new' || cmd === '/baru') {
    const properties = await listProps({ status: 'available' }, 5, { createdAt: 'desc' })
    if (properties.length === 0) return { text: 'No new listings yet.' }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    let response = '🆕 *Latest Listings*\n\n'
    properties.forEach((p, i) => {
      response += `${i + 1}. *${p.title}*\n   📍 ${p.location} | 💰 RM ${p.price.toLocaleString()}\n   📅 ${new Date(p.createdAt).toLocaleDateString()}\n\n`
    })
    response += `💡 Reply with number for details + photos\n\n🌐 Browse all properties: ${appUrl}/p`
    return { text: response }
  }

  // /price - view by price
  if (cmd === '/price' || cmd === '/harga') {
    const properties = await listProps({ status: 'available' }, 10, { price: 'asc' })
    if (properties.length === 0) return { text: 'No properties available.' }

    let response = '💰 *Properties by Price*\n\n'
    properties.forEach((p, i) => {
      response += `${i + 1}. *RM ${p.price.toLocaleString()}* - ${p.title}\n   📍 ${p.location} | 🛏️ ${p.bedrooms}BR\n\n`
    })
    response += '💡 Reply with number for details + photos'
    return { text: response }
  }

  // /agent - agent info
  if (cmd === '/agent' || cmd === '/profile') {
    if (agent) {
      return { text: `👤 *${agent.name}*
${agent.company ? `🏢 ${agent.company}\n` : ''}
${agent.phone ? `📱 ${agent.phone}\n` : ''}
${agent.email ? `📧 ${agent.email}\n` : ''}
${agent.tagline ? `\n💬 ${agent.tagline}` : ''}
${agent.specialities ? `\n🏆 Specialities: ${agent.specialities}` : ''}` }
    }
    return { text: 'Agent information not available.' }
  }

  // /contact - contact details
  if (cmd === '/contact' || cmd === '/hubungi') {
    if (agent) {
      return { text: `📞 *Contact ${agent.name}*\n\n📱 Phone: ${agent.phone || 'Not available'}\n${agent.email ? `📧 Email: ${agent.email}\n` : ''}${agent.company ? `🏢 ${agent.company}\n` : ''}\n💡 Or just type your question below!` }
    }
    return { text: 'Contact information not available.' }
  }

  // /search - search properties
  if (cmd === '/search' || cmd === '/cari') {
    return { text: '🔍 *Search Properties*\n\nJust type what you\'re looking for:\n• "condo in KL"\n• "3 bedroom house"\n• "semi-d under RM1M"\n• "rent in Bangsar"\n\nExample: "I want condo in KLCC under RM800k"' }
  }

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
  // Invalidate every pending handler and reconnect timer from old sockets.
  generation++
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
  if (sock) {
    try {
      // logout() unlinks the device from the phone's Linked Devices list;
      // without it the phone keeps a stale entry after we wipe local auth.
      await sock.logout()
    } catch {}
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
