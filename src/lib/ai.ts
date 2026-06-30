import OpenAI from 'openai'
import { prisma } from './db'

const ai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
})

interface AIResponse {
  text: string
  images?: string[]
  intent?: string
}

function buildSystemPrompt(agentProfile: any) {
  const agentName = agentProfile?.name || 'Property Agent'
  const agentCompany = agentProfile?.company || ''
  const agentPhone = agentProfile?.phone || ''
  const agentTagline = agentProfile?.tagline || 'Your trusted property agent'
  const agentBio = agentProfile?.bio || ''
  const agentLanguages = agentProfile?.languages || 'English, Malay'
  const agentSpecialities = agentProfile?.specialities || 'Residential, Commercial'
  const welcomeMsg = agentProfile?.welcomeMsg || ''

  return `You are ${agentName}${agentCompany ? ` from ${agentCompany}` : ''}, a professional Malaysian property agent assistant. ${agentTagline}

${agentBio ? `About you: ${agentBio}\n` : ''}
Your specialities: ${agentSpecialities}
Languages you speak: ${agentLanguages}
${agentPhone ? `Your contact: ${agentPhone}` : ''}

RULES:
1. Be friendly, professional, and helpful
2. Reply in the SAME LANGUAGE the customer uses (English, Malay, Chinese, or Tamil)
3. When customer asks about properties, I will provide you with relevant listings
4. When customer wants to book a viewing, collect: their name, phone, preferred date and time
5. When customer wants a callback, collect: their name, phone, preferred time
6. Keep responses concise for WhatsApp format
7. Use emojis sparingly for friendly tone
8. If you don't have enough info, ask clarifying questions
9. When greeting a new customer, introduce yourself naturally by name. Example: "Hi! I'm ${agentName}, your property agent. How can I help you today?"
${welcomeMsg ? `10. Use this as your greeting when customers say hi: "${welcomeMsg}"` : ''}

IMPORTANT: You MUST respond with ONLY a valid JSON object, no other text. No markdown, no code blocks, just pure JSON.

Response format:
{"reply":"your message to customer","intent":"detected_intent","propertyQuery":{"type":"rent","location":"Kuala Lumpur","minPrice":null,"maxPrice":null,"bedrooms":null}}

propertyQuery should be null if not searching for properties.
intent options: property_search, booking_viewing, booking_callback, price_inquiry, general`
}

export async function handleIncomingMessage(phone: string, message: string): Promise<AIResponse> {
  if (!process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY === 'your_deepseek_api_key_here') {
    return { text: 'AI belum dikonfigurasi. Sila hubungi admin.' }
  }

  try {
    const agentProfile = await prisma.agentProfile.findFirst()
    const systemPrompt = buildSystemPrompt(agentProfile)

    const properties = await searchProperties(message)
    const propertyContext = properties.length > 0
      ? `\n\nRelevant properties found:\n${properties.map((p: { title: string; propertyType: string; price: number; location: string; bedrooms: number; bathrooms: number; size: string; status: string }) =>
        `- ${p.title} | ${p.propertyType} | RM ${p.price} | ${p.location} | ${p.bedrooms}BR/${p.bathrooms}BA | ${p.size} | Status: ${p.status}`
      ).join('\n')}`
      : ''

    const completion = await ai.chat.completions.create({
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt + propertyContext },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_tokens: 500,
    })

    const content = completion.choices[0]?.message?.content

    if (!content || content.trim() === '') {
      console.error('Empty AI response')
      return { text: 'Maaf, saya tidak dapat memproses mesej ini.' }
    }

    const parsed = tryParseJSON(content)
    if (parsed) {
      const propertyQuery = parsed.propertyQuery || null
      let displayProperties = properties
      if (propertyQuery) {
        const refined = await searchPropertiesFromQuery(propertyQuery)
        if (refined.length > 0) displayProperties = refined
      }
      return {
        text: parsed.reply || content,
        intent: parsed.intent || 'general',
        images: get_property_images(displayProperties, propertyQuery),
      }
    }

    return { text: content }
  } catch (error: any) {
    console.error('AI Error:', error?.message || error)

    if (error?.status === 401) {
      return { text: 'API key tidak sah. Sila hubungi admin.' }
    }
    if (error?.status === 429) {
      return { text: 'Terlalu banyak permintaan. Sila cuba lagi sebentar.' }
    }

    return { text: 'Maaf, saya mengalami masalah teknikal. Sila cuba lagi sebentar.' }
  }
}

function tryParseJSON(content: string): any {
  try {
    let jsonStr = content.trim()

    jsonStr = jsonStr.replace(/```json\s*/gi, '').replace(/```\s*/g, '')
    jsonStr = jsonStr.replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/, '$1')

    if (!jsonStr.startsWith('{')) return null

    return JSON.parse(jsonStr)
  } catch {
    return null
  }
}

async function searchPropertiesFromQuery(query: {
  type?: string
  location?: string
  minPrice?: number | null
  maxPrice?: number | null
  bedrooms?: number | null
}) {
  const where: any = { status: 'available' }

  if (query.type) where.propertyType = query.type
  if (query.location) {
    where.OR = [
      { location: { contains: query.location } },
      { title: { contains: query.location } },
    ]
  }
  if (query.bedrooms) where.bedrooms = query.bedrooms
  if (query.minPrice != null || query.maxPrice != null) {
    where.price = {}
    if (query.minPrice != null) where.price.gte = query.minPrice
    if (query.maxPrice != null) where.price.lte = query.maxPrice
  }

  return prisma.property.findMany({
    where,
    take: 5,
    orderBy: { createdAt: 'desc' },
  })
}

async function searchProperties(message: string) {
  const lowerMsg = message.toLowerCase()

  let where: any = { status: 'available' }

  // Search by property category (rent vs buy)
  if (lowerMsg.includes('rent') || lowerMsg.includes('sewa') || lowerMsg.includes('rental')) {
    where.propertyCategory = 'rent'
  } else if (lowerMsg.includes('buy') || lowerMsg.includes('beli') || lowerMsg.includes('purchase')) {
    where.propertyCategory = 'buy'
  }

  // Search by property type
  const typeConditions: any[] = []
  if (lowerMsg.includes('condo') || lowerMsg.includes('apartment') || lowerMsg.includes('flat')) {
    typeConditions.push(
      { propertyType: { contains: 'Condominium' } },
      { propertyType: { contains: 'Apartment' } },
      { propertyType: { contains: 'Service Residence' } }
    )
  }
  if (lowerMsg.includes('house') || lowerMsg.includes('teres') || lowerMsg.includes('terrace')) {
    typeConditions.push(
      { propertyType: { contains: 'Terrace' } },
      { propertyType: { contains: 'House' } }
    )
  }
  if (lowerMsg.includes('semi') || lowerMsg.includes('semi-d')) {
    typeConditions.push({ propertyType: { contains: 'Semi-Detached' } })
  }
  if (lowerMsg.includes('studio')) {
    typeConditions.push({ propertyType: { contains: 'Studio' } })
  }
  if (lowerMsg.includes('bungalow')) {
    typeConditions.push({ propertyType: { contains: 'Bungalow' } })
  }
  if (typeConditions.length > 0) {
    where.OR = typeConditions
  }

  // Search by bedrooms
  const bedroomMatch = message.match(/(\d+)\s*(?:bed|br|bilik| Bedroom)/i)
  if (bedroomMatch) {
    where.bedrooms = parseInt(bedroomMatch[1])
  }

  // Search by location
  const locationMatch = message.match(/(?:in|at|kat|dekat)\s+([A-Za-z\s]+?)(?:\s*\?|\s*$|\s*,)/i)
  if (locationMatch) {
    const loc = locationMatch[1].trim()
    if (loc.length > 2) {
      where.OR = where.OR || []
      where.OR.push(
        { location: { contains: loc } },
        { title: { contains: loc } }
      )
    }
  }

  return prisma.property.findMany({
    where,
    take: 5,
    orderBy: { createdAt: 'desc' },
  })
}

function get_property_images(properties: any[], query: any): string[] {
  if (!properties.length) return []

  const images: string[] = []
  for (const prop of properties.slice(0, 2)) {
    try {
      const imgs = JSON.parse(prop.images || '[]')
      if (imgs.length > 0) {
        images.push(imgs[0])
      }
    } catch {}
  }
  return images
}

export async function createBooking(data: {
  customerName: string
  customerPhone: string
  propertyId: number
  bookingType: string
  date: string
  time: string
  notes?: string
}) {
  return prisma.booking.create({ data })
}
