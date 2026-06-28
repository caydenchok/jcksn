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

export async function startWhatsApp() {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true })
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
  const { version } = await fetchLatestBaileysVersion()

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    browser: ['WhatsApp JCKSN', 'Chrome', '1.0.0'],
  })

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      qrCode = qr
      connectionStatus = 'connecting'
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
      console.log('Connection closed:', lastDisconnect?.error, 'Reconnecting:', shouldReconnect)
      connectionStatus = 'disconnected'
      qrCode = null

      if (shouldReconnect) {
        setTimeout(() => startWhatsApp(), 3000)
      }
    } else if (connection === 'open') {
      connectionStatus = 'connected'
      qrCode = null
      console.log('WhatsApp connected!')
    }
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.key.fromMe && msg.key.remoteJid?.endsWith('@s.whatsapp.net')) {
        await processMessage(msg)
      }
    }
  })
}

async function processMessage(msg: any) {
  try {
    const phone = msg.key.remoteJid!.replace('@s.whatsapp.net', '')
    const content = getMessageContent(msg)
    if (!content) return

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
        const imageBuffer = fs.readFileSync(imagePath)
        await sock.sendMessage(msg.key.remoteJid!, {
          image: imageBuffer,
          caption: '',
        })
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

export async function sendMessage(phone: string, text: string) {
  if (!sock) throw new Error('WhatsApp not connected')
  const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`
  await sock.sendMessage(jid, { text })
}
