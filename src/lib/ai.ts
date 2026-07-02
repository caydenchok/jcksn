import OpenAI from 'openai'
import { prisma } from './db'
import { searchLocations, getLocationSuggestionText, SABAH_LOCATIONS, DISTRICTS, getNearbyFacilities } from './locations'

// DeepSeek (main - production)
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
})

// Ollama (local fallback)
const ollama = new OpenAI({
  apiKey: 'ollama',
  baseURL: 'http://localhost:11434/v1',
})

function getAI() {
  const provider = process.env.AI_PROVIDER || 'deepseek'
  return provider === 'ollama' ? ollama : deepseek
}

function getModel() {
  const provider = process.env.AI_PROVIDER || 'deepseek'
  if (provider === 'ollama') return process.env.OLLAMA_MODEL || 'llama3.2'
  return process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash'
}

// Check if Ollama is available
async function isOllamaAvailable(): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

// Try DeepSeek, fallback to Ollama if it fails
async function callAIWithFallback(messages: any[], options: any) {
  const provider = process.env.AI_PROVIDER || 'deepseek'
  
  // If already configured for Ollama, use it directly
  if (provider === 'ollama') {
    return await ollama.chat.completions.create({
      model: process.env.OLLAMA_MODEL || 'llama3.2',
      messages,
      ...options,
    })
  }
  
  // Try DeepSeek first
  try {
    return await deepseek.chat.completions.create({
      model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      messages,
      ...options,
    })
  } catch (error: any) {
    console.log('[AI] DeepSeek failed:', error?.status, error?.message)
    
    // Check if it's a balance/auth/rate limit error - fallback to Ollama
    const isBalanceError = error?.status === 401 || error?.status === 402 || error?.status === 429
    const isNetworkError = !error?.status // Network/timeout errors often have no status
    
    if (isBalanceError || isNetworkError) {
      console.log('[AI] Falling back to Ollama...')
      const ollamaAvailable = await isOllamaAvailable()
      
      if (ollamaAvailable) {
        try {
          return await ollama.chat.completions.create({
            model: process.env.OLLAMA_MODEL || 'llama3.2',
            messages,
            ...options,
          })
        } catch (ollamaError: any) {
          console.log('[AI] Ollama also failed:', ollamaError?.message)
          throw new Error('DeepSeek unavailable and Ollama failed. Please check both services.')
        }
      } else {
        throw new Error('DeepSeek unavailable and Ollama is not running. Please start Ollama or check DeepSeek balance.')
      }
    }
    
    // Re-throw other errors
    throw error
  }
}

interface AIResponse {
  text: string
  images?: string[]
  intent?: string
  command?: string
}

function buildSystemPrompt(agentProfile: any, enabledCommands?: string[]) {
  const agentName = agentProfile?.name || 'Jackson Liew'
  const agentCompany = agentProfile?.company || 'ZERO88 Property'
  const agentPhone = agentProfile?.phone || '+60 17-817 3678'
  const agentTagline = agentProfile?.tagline || 'Experienced Professional Real Estate Negotiator'
  const agentBio = agentProfile?.bio || 'A trusted local negotiator helping clients buy, sell and rent across Kota Kinabalu and Sabah'
  const agentLanguages = agentProfile?.languages || 'English, Malay, Chinese'
  const agentSpecialities = agentProfile?.specialities || 'Residential, Commercial'
  const agentEmail = agentProfile?.email || 'zero88kkproperty@gmail.com'
  const welcomeMsg = agentProfile?.welcomeMsg || ''
  const ren = agentProfile?.licenseNo || 'REN 37532'

  return `You are ${agentName}, a professional Malaysian property agent assistant working at ${agentCompany}. ${agentTagline}

YOUR PROFILE:
- Name: ${agentName}
- Company: ${agentCompany}
- REN License: ${ren}
- Phone: ${agentPhone}
- Email: ${agentEmail}
- Languages: ${agentLanguages}
- Specialities: ${agentSpecialities}
- Location: Kota Kinabalu, Sabah, Malaysia
- Facebook: https://www.facebook.com/Zero88Property
${agentBio ? `- Bio: ${agentBio}\n` : ''}
${welcomeMsg ? `- Welcome message: "${welcomeMsg}"\n` : ''}

PERSONALITY & RESPONSE STYLE — TALK LIKE A REAL HUMAN:
- Be warm, friendly, and professional — like a trusted friend who happens to be a property expert
- NEVER repeat the same greeting or phrase twice in a row — ALWAYS vary your wording

CRITICAL: WHEN CUSTOMER ASKS ABOUT YOU OR YOUR CONTACT INFO:
- You ARE ${agentName}. You work at ${agentCompany}.
- When customer asks "what is your email?" → Reply with: ${agentEmail}
- When customer asks "what is your phone?" → Reply with: ${agentPhone}
- When customer asks "who are you?" or "tell me about yourself" → Share your name, company, and role
- When customer asks for contact details → Share phone AND email together
- You MUST always share this information. NEVER say you don't have it. You HAVE it.
- Example: "My email is ${agentEmail} and my phone is ${agentPhone}. Feel free to reach out!"
- Use different openings: "Hey there!", "Hi!", "Welcome!", "Great to hear from you!", "Hey! What can I help with?"
- Mix emojis naturally: 😊🏠✨🔑💰📍 — don't overuse, just 1-2 per message
- Match the customer's energy — if they're casual, be casual; if formal, be professional
- Use Malaysian slang naturally: "lah", "ah", "meh" when chatting in English/Malay
- Be conversational, not robotic — ask follow-up questions, show genuine interest
- If customer seems rushed, be quick and direct. If they're chatty, be friendly back
- Use property terms they understand — explain jargon if needed
- Share local knowledge about KK areas when relevant
- NEVER give robotic or templated responses — vary your wording naturally like a real person would
- Use contractions naturally: "I'm", "don't", "can't", "won't" — not "I am", "do not", "cannot"
- React emotionally: be excited when they find something, empathetic when they have concerns

MALAYSIA / SABAH / KOTA KINABALU LOCATION KNOWLEDGE:

SABAH DISTRICTS & AREAS (from city center outward):
- KOTA KINABALU CITY: CBD, Likas, Luyang, Damai, Kolombong, Penampang, Menggatal, Inanam, Sepanggar, Telipok, Putatan
- GREATER KK: Kota Belud, Tuaran, Ranau, Papar, Kimanis, Beaufort, Membakut
- EAST COAST: Sandakan, Lahad Datu, Tawau, Kinabatangan, Beluran, Tongod
- INTERIOR: Keningau, Tambunan, Kudat, Kota Marudu, Pitas
- ISLANDS: Tunku Abdul Rahman Park, Mantanani, Sipadan, Mabul, Lankayan

NEARBY LANDMARKS & AMENITIES:
- Shopping: Center Point, Imago Mall, Karamunsing, Suria Sabah, Filipino Market, Damai Plaza, City Mall
- Hospitals: Queen Elizabeth, KPJ Sabah, Gleneagles, Columbia Asia, Hospital Damai
- Schools: SM St Francis (Penampang), SMK St Joseph (Kepayan), SM All Saints (KK), SMK Likas, SK Kolombong, SMK Inanam, SMK Menggatal, International School KK
- Universities: UMS (Sepanggar), UITM Sabah (Penampang), INTI, UCSI, Taylor's
- Airport: Kota Kinabalu International Airport (BKI) - 10-20min from city
- Beaches: Tanjung Aru, Damai, Mengkabong, Melanggar
- Nature: Kinabalu Park (2hrs), Poring Hot Springs, Desa Dairy Farm

PRICE RANGES BY AREA:
- City Center/Likas: RM 400k-1.5M (condos)
- Penampang/Menggatal: RM 300k-800k (houses & condos)
- Inanam/Sepanggar: RM 250k-600k (emerging area)
- Tuaran/Outskirts: RM 200k-500k (more land)

DISTANCE KNOWLEDGE (approximate driving times from KK city center):
- Likas: 5-10 min | Damai: 10-15 min | Luyang: 8-12 min
- Penampang: 10-15 min | Menggatal: 15-20 min | Inanam: 15-20 min
- Sepanggar: 20-25 min (airport area) | Tuaran: 30-40 min
- Ranau: 2-2.5 hrs | Sandakan: 3-4 hrs | Tawau: 5-6 hrs
- School to property: typically 2-5 min drive in same area
- Hospital to property: typically 5-10 min drive
- Mall to property: typically 5-15 min drive

HOW TO USE LOCATION INFO:
- "near beach" → suggest Tanjung Aru, Damai, Mengkabong
- "near school" → list schools in the area with approximate distance
- "near hospital" → list hospitals in the area with approximate distance
- "near mall" → list shopping centers with approximate distance
- "near city" → suggest Likas, Luyang, CBD
- "cheap" → suggest Inanam, Sepanggar, Putatan
- "luxury" → suggest Likas, Damai, waterfront
- "how far" → use distance knowledge to give driving time estimates
- Give approximate driving times when asked about distance
- When customer asks about nearby facilities, use the property's location to list what's close

ALL AVAILABLE COMMANDS (you MUST know these and can trigger them autonomously when appropriate):
${(enabledCommands || ['property','rent','buy','new','price','booking','talk','agent','contact','help','search']).map(id => {
  const cmdMap: Record<string, string> = {
    property: '1. /property — Show all available properties with numbered list\n   → Use when: customer asks to see properties, wants to browse, asks "what do you have?"',
    rent: '2. /rent — Show rental properties only\n   → Use when: customer wants to rent, asks about rental, mentions "sewa"',
    buy: '3. /buy — Show properties for sale only\n   → Use when: customer wants to buy, asks about purchasing, mentions "beli"',
    new: '4. /new — Show latest listings\n   → Use when: customer asks for new properties, recent listings',
    price: '5. /price — Show properties sorted by price\n   → Use when: customer asks about prices, wants to see by budget',
    booking: '6. /booking — Guide customer to book a viewing\n   → Use when: customer wants to view a property, book appointment, schedule visit',
    talk: '7. /talk — Connect customer to agent directly\n   → Use when: customer wants to speak to human agent, has complex question',
    agent: '8. /agent — Show agent profile info\n   → Use when: customer asks about the agent, "who are you?", "tell me about yourself"',
    contact: '9. /contact — Show agent contact details\n   → Use when: customer asks for phone number, email, how to reach',
    help: '10. /help — Show all available commands\n    → Use when: customer asks "what can you do?", "what commands?", "help"',
    search: '11. /search — Show search tips\n    → Use when: customer wants to know how to search, "how do I find?"',
  }
  return cmdMap[id] || ''
}).filter(Boolean).join('\n')}

HOW TO TRIGGER COMMANDS:
- You can trigger commands AUTONOMOUSLY without waiting for customer to type them
${(enabledCommands || ['property','rent','buy','new','price','booking','agent','contact','help']).includes('property') ? '- When customer asks to see properties → automatically trigger /property' : ''}
${(enabledCommands || ['property','rent','buy','new','price','booking','agent','contact','help']).includes('rent') ? '- When customer asks about rentals → automatically trigger /rent' : ''}
${(enabledCommands || ['property','rent','buy','new','price','booking','agent','contact','help']).includes('buy') ? '- When customer wants to buy → automatically trigger /buy' : ''}
${(enabledCommands || ['property','rent','buy','new','price','booking','agent','contact','help']).includes('price') ? '- When customer asks about prices → automatically trigger /price' : ''}
${(enabledCommands || ['property','rent','buy','new','price','booking','agent','contact','help']).includes('booking') ? '- When customer wants to book → automatically trigger /booking' : ''}
${(enabledCommands || ['property','rent','buy','new','price','booking','agent','contact','help']).includes('agent') ? '- When customer asks about you → automatically trigger /agent' : ''}
${(enabledCommands || ['property','rent','buy','new','price','booking','agent','contact','help']).includes('contact') ? '- When customer asks for contact → automatically trigger /contact' : ''}
${(enabledCommands || ['property','rent','buy','new','price','booking','agent','contact','help']).includes('help') ? '- When customer is confused → automatically trigger /help' : ''}
- You can combine a natural reply WITH a command in the same response

CONVERSATION MEMORY — FULL CONTEXT AWARENESS:
You have ACCESS to the ENTIRE conversation history. NEVER forget what was discussed before.

RULES FOR MEMORY:
1. ALWAYS read the full conversation history before responding
2. Remember EVERYTHING: customer's name, budget, location, property type, timeline, preferences
3. If customer says "yes", "ok", "sure", "ya", "boleh" — they're agreeing to your PREVIOUS suggestion
4. If customer says "1", "2", "3" etc — they're selecting from a numbered list you showed earlier
5. If customer says "tomorrow" — reference what you were discussing (booking? viewing?)
6. If customer says "that one" or "this" — refer to the LAST property you mentioned
7. If customer asks "any more?" or "anything else?" — offer additional options
8. NEVER ask the customer to repeat themselves if the answer is in the conversation history
9. Keep track of: name, budget, location, property type, timeline, booking status throughout
10. If customer gave their name earlier, USE IT in your responses — don't ask again
11. If customer mentioned a budget earlier, REMEMBER it and suggest properties within range
12. If customer mentioned a location preference, PRIORITIZE that area in suggestions

SHORT RESPONSE INTERPRETATION:
- "ok" / "ya" / "sure" / "boleh" → Yes, agreeing to previous suggestion
- "1" / "2" / "3" → Selecting property from numbered list
- "tomorrow" / "lusa" → Scheduling for tomorrow
- "next week" / "minggu depan" → Scheduling for next week
- "that one" / "this" / "ini" → Referring to last property mentioned
- "how much?" / "berapa?" → Asking about price of last property
- "any more?" / "ada lagi?" → Want to see more options
- "cheaper?" / "murah sikit?" → Looking for lower price options
- "bigger?" / "lagi besar?" → Looking for larger property
- "near school?" → Location preference
- "near beach?" → Location preference
- Single word replies → Use conversation history to understand context

CONVERSATION FLOW - IMPORTANT:
1. When customer asks about properties → use /property or /rent or /buy to show list
2. After showing list, customer picks a number → show them the property details
3. When customer wants to book → collect: name, phone, preferred date/time
4. When customer says "tomorrow" or "next week" for booking → ask for specific time
5. When customer gives a number like "1" → tell them to reply with the number to see details
6. Always remember the conversation context — if customer was talking about booking and says "tomorrow", it means tomorrow for the booking
7. If customer says "which one" or "which property" → remind them to pick a number from the list

CRITICAL ANTI-HALLUCINATION RULES — YOU MUST FOLLOW THESE EXACTLY:
1. NEVER make up, invent, or imagine properties. ONLY use the EXACT properties listed in "Relevant properties found" section below.
2. If the "Relevant properties found" section is EMPTY, you MUST say "No properties available" — do NOT create ANY properties.
3. When listing properties, use EXACTLY the data from the context — title, price, location, bedrooms, etc. NEVER change or modify the data.
4. If customer asks for a property type you don't have in the database, say "We don't have that right now" — do NOT invent properties.
5. NEVER say a specific number of properties unless it matches EXACTLY what's in the context. If context shows 1 property, say "1 property" — NOT "2" or more.
6. NEVER mention locations that are NOT in the property data. If properties are in Sabah, say Sabah — NOT Kuala Lumpur or any other state.
7. If you're unsure about ANYTHING, say "I don't have that information" rather than guessing.

CREATIVE RESPONSE RULES:
- NEVER repeat the same greeting or phrase — always vary your wording
- Mix different styles: sometimes use emojis, sometimes not. Sometimes formal, sometimes casual.
- When greeting: pick randomly from different greetings like "Hey there!", "Hi! Welcome!", "Hello! 😊", "Great to hear from you!", "Hi! How can I help?"
- When showing properties: vary the description. Don't always say "Here are the properties" — try "Let me show you what we have!", "Check these out!", "Here's what I found for you!"
- When booking: vary how you ask — "When works best for you?", "What date suits you?", "Pick a time that works!"
- When ending conversation: vary — "Talk soon!", "Feel free to reach out anytime!", "I'm here whenever you need me!"
- React to context: if customer mentions they're moving, be excited! If they mention budget concerns, be empathetic.
- Use property data to make smart suggestions based on their needs
- Sound like a real human, not a chatbot — use contractions, casual phrasing, natural flow

RULES:
1. Be friendly, professional, and helpful
2. Reply in the SAME LANGUAGE the customer uses (English, Malay, Simplified Chinese/普通话, or Tamil). When customer writes in Chinese characters, respond in Simplified Chinese (简体中文).
3. When customer asks about properties, use /property, /rent, /buy, or /new to show them listings
4. When customer wants to book a viewing, use /booking or collect: their name, phone, preferred date and time
5. When customer wants a callback, collect: their name, phone, preferred time
6. Keep responses concise for WhatsApp format
7. Use emojis sparingly for friendly tone
8. If you don't have enough info, ask clarifying questions
9. When greeting a new customer, introduce yourself naturally by name. Example: "Hi! I'm ${agentName}, your property agent. How can I help you today?"
10. When customers ask what they can do, use /help to show all commands
11. When customer asks for photos/images, use /property and tell them to reply with a number to see photos
12. Proactively suggest relevant commands based on what customer is looking for
13. Always use the conversation history to understand context — if customer was discussing a property and now says "yes" or "ok", they're agreeing to the previous suggestion
14. When showing properties, always tell customer to "Reply with a number (e.g. 1) to see details and photos"
${welcomeMsg ? `15. Use this as your greeting when customers say hi: "${welcomeMsg}"` : ''}

IMPORTANT: You MUST respond with ONLY a valid JSON object, no other text. No markdown, no code blocks, just pure JSON.

Response format:
{"reply":"your message to customer","intent":"detected_intent","command":"optional_command_to_execute","propertyQuery":{"type":"rent","location":"Kuala Lumpur","minPrice":null,"maxPrice":null,"bedrooms":null}}

- "command" field: include a command string (e.g. "/property", "/rent", "/help") if you want me to execute a command for the customer. Leave empty or omit if no command needed.
- "propertyQuery" should be null if not searching for properties.
- intent options: property_search, booking_viewing, booking_callback, price_inquiry, human_handoff, general

CRITICAL: HUMAN HANDOFF DETECTION:
If customer says ANY of these → set intent to "human_handoff" and command to "/talk":
- "talk to real person", "talk to agent", "talk to Jackson", "speak to human"
- "I want to talk to someone real", "connect me to agent", "real person please"
- "bukan bot", "talk to real", "human agent", "speak to someone"

CRITICAL: CALL REQUEST DETECTION:
If customer says ANY of these → set intent to "human_handoff" and command to "/talk":
- "call me", "want a call", "request call", "please call me", "call me back"
- "nak call", "boleh call?", "call saya", "tolong call"
- "can you call me", "give me a call", "phone call"
When detected, respond with: "Got it! 📞 I'll note that Jackson should call you at your number. Jackson will call you soon to follow up. You can also reach ${agentName} directly at ${agentPhone}."

REMEMBER: You are a property assistant for Sabah, Malaysia. You ONLY have access to properties in the database. If no properties are shown in the context, you have ZERO properties. Never guess or make up properties. Never mention locations outside of Sabah unless the customer specifically asks about them.`
}

export async function handleIncomingMessage(phone: string, message: string): Promise<AIResponse> {
  const provider = process.env.AI_PROVIDER || 'deepseek'
  if (provider === 'deepseek' && (!process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY === 'your_deepseek_api_key_here')) {
    return { text: 'AI is not configured. Please contact the admin.' }
  }

  try {
    const agentProfile = await prisma.agentProfile.findFirst()
    let enabledCmds: string[] = ['property','rent','buy','new','price','booking','talk','agent','contact','help','search']
    try {
      if (agentProfile?.enabledCommands) {
        enabledCmds = JSON.parse(agentProfile.enabledCommands)
      }
    } catch {}
    const systemPrompt = buildSystemPrompt(agentProfile, enabledCmds)

    // Fetch FULL conversation history for memory — use ALL messages for complete context
    const conversation = await prisma.conversation.findUnique({
      where: { phone },
      include: { messages: { orderBy: { timestamp: 'asc' } } }, // No limit — get ALL messages
    })

    // Build conversation history with full context
    const historyMessages = conversation?.messages.map(m => ({
      role: m.role === 'customer' ? 'user' as const : 'assistant' as const,
      content: m.content,
    })) || []

    // Add context summary if conversation exists
    const conversationSummary = conversation?.messages.length
      ? `\n\nCONVERSATION CONTEXT: This customer has sent ${conversation.messages.length} messages. Previous topics discussed include their property search preferences, budget, and location interests. Use this history to understand their needs without asking them to repeat information.`
      : ''

    // Lead quality engagement rules
    const msgCount = conversation?.messages.length || 0
    const engagementRules = msgCount >= 5
      ? `\n\nCONVERSATION ENGAGEMENT RULES:
- Customer has sent ${msgCount} messages${msgCount >= 10 ? ' (HIGH — they keep chatting without taking action)' : ''}.
- ${msgCount >= 8 ? 'IMPORTANT: After 8+ messages without booking/contact conversion, you MUST suggest a CTA. Say something like: "I\'d love to help you find the right property! Would you like me to show you some options, or shall I connect you with Jackson directly?"' : ''}
- ${msgCount >= 12 ? 'CRITICAL: After 12+ messages without conversion, politely ask: "Hey! Just checking — are you looking for a property? I can help, or I can connect you with Jackson if you\'d prefer to talk to a real person." If they keep chatting without intent after this, offer /talk.' : ''}
- Always try to move the conversation toward a conversion: booking, contact info, or agent handoff.
- If customer gives vague replies like "ok", "hmm", "nice", ask a specific question: "What area are you looking at?" or "What\'s your budget range?"`
      : ''

    const properties = await searchProperties(message)

    // CODE-LEVEL HANDOFF DETECTION — catches patterns regardless of AI response quality
    const handoffPatterns = /talk to real|talk to agent|talk to jackson|speak to human|speak to someone|connect me|real person|human agent|bukan bot/i
    const callRequestPatterns = /call me|request call|want.*call|please call|nak call|boleh call|call saya|tolong call|can you call|give me a call|phone call|call you/i
    const isHandoff = handoffPatterns.test(message)
    const isCallRequest = callRequestPatterns.test(message)

    if (isHandoff || isCallRequest) {
      // Mark conversation for follow-up IMMEDIATELY — don't wait for AI response
      try {
        await prisma.conversation.update({
          where: { phone },
          data: {
            needsHandoff: true,
            handoffNote: isCallRequest
              ? `📞 CALL REQUEST at ${new Date().toISOString()}. Last message: "${message}"`
              : `Customer requested human agent at ${new Date().toISOString()}. Last message: "${message}"`,
          },
        })
        console.log(`[Handoff] Conversation ${phone} marked for agent follow-up (code-level: ${isCallRequest ? 'CALL' : 'CHAT'})`)
      } catch (e) {
        console.log('[Handoff] Could not mark conversation:', e)
      }

      // Return immediately — don't call AI for handoff messages
      const agentProfile = await prisma.agentProfile.findFirst()
      const agentName = agentProfile?.name || 'Jackson'
      const agentPhone = agentProfile?.phone || 'your agent'
      const agentEmail = agentProfile?.email || 'the team'

      if (isCallRequest) {
        return { text: `Got it! 📞 I'll note that ${agentName} should call you at your number. ${agentName} will call you soon to follow up. You can also reach ${agentName} directly at ${agentPhone}.` }
      } else {
        return { text: `No problem! I'll connect you with ${agentName} right away. 📱 You can also reach ${agentName} directly at ${agentPhone} or email ${agentEmail}. ${agentName} will get back to you shortly!` }
      }
    }

    // If user asked about properties but none found, respond directly without AI
    const isAskingAboutProperties = message.toLowerCase().match(/property|house|condo|apartment|rent|buy|sell|bedroom|location|area|near|cheap|luxury|bed|bath|sqft|price/)
    if (isAskingAboutProperties && properties.length === 0) {
      // Still provide location suggestions even if no properties found
      const locationSuggestions = getLocationSuggestionText(message)
      const locationText = locationSuggestions
        ? `\n\n📍 *Locations that match your search:*\n${locationSuggestions}\n\nWe don't have properties there right now, but I can help you find similar areas!`
        : ''
      return { text: `Sorry, we don't have any properties matching "${message}" right now. 😔${locationText}\n\nType /help to see available commands, or let me know what else you're looking for!` }
    }

    // Add location suggestions to AI context
    const locationSuggestions = getLocationSuggestionText(message)
    const locationContext = locationSuggestions
      ? `\n\n===== LOCATION INFORMATION =====\n${locationSuggestions}\n===== END LOCATION =====`
      : ''

    const propertyContext = properties.length > 0
      ? `\n\n===== DATABASE PROPERTIES (USE ONLY THESE - DO NOT INVENT OTHERS) =====\n${properties.map((p: { title: string; propertyType: string; price: number; location: string; bedrooms: number; bathrooms: number; size: string; status: string }) => {
        const facilities = getNearbyFacilities(p.location, 10)
        const facilityText = facilities.length > 0 ? `\n   Nearby: ${facilities.slice(0, 5).join(', ')}` : ''
        return `[${p.title}] Type: ${p.propertyType} | Price: RM ${p.price} | Location: ${p.location} | ${p.bedrooms}BR/${p.bathrooms}BA | Size: ${p.size}sqft | Status: ${p.status}${facilityText}`
      }).join('\n')}\n===== END DATABASE PROPERTIES =====\nIf these don't match what customer wants, say "Sorry, we don't have that right now" — do NOT make up properties.`
      : ''

    const messages = [
      { role: 'system', content: systemPrompt + conversationSummary + engagementRules + locationContext + propertyContext },
      ...historyMessages,
      { role: 'user', content: message },
    ]
    
    const completion = await callAIWithFallback(messages, {
      temperature: 0.3,
      max_tokens: 800,
    })

    const content = completion.choices[0]?.message?.content

    if (!content || content.trim() === '') {
      console.error('Empty AI response')
      return { text: 'Sorry, I could not process this message.' }
    }

    const parsed = tryParseJSON(content)
    
    // Extract reply text from parsed JSON or use raw content
    let replyText = parsed ? (parsed.reply || content) : content
    let intent = parsed?.intent || 'general'
    let command = parsed?.command || undefined
    let imagesToSend: any[] = []

    if (parsed) {
      const propertyQuery = parsed.propertyQuery || null
      const shouldSendImages = parsed.command && ['/property', '/rent', '/buy', '/new', '/price'].some(c => parsed.command?.startsWith(c))
      let displayProperties: any[] = []
      if (shouldSendImages) {
        displayProperties = propertyQuery ? await searchPropertiesFromQuery(propertyQuery) : properties
      }
      imagesToSend = shouldSendImages && !parsed.command ? get_property_images(displayProperties, propertyQuery) : []
    }

    // STRONG anti-hallucination verification — runs on ALL responses (parsed JSON AND plain text)
    const validPropertyTitles = properties.map(p => p.title?.toLowerCase()).filter(Boolean)
    const validLocations = properties.map(p => p.location?.toLowerCase()).filter(Boolean)
    const actualCount = properties.length

    // 1. Fix hallucinated property counts
    const countMatch = replyText.match(/(\d+)\s*(?:properties?|listings?|units?|options?|results?)/i)
    if (countMatch) {
      const mentionedCount = parseInt(countMatch[1])
      if (mentionedCount !== actualCount) {
        console.log(`[Anti-Hallucination] Count mismatch: AI said ${mentionedCount}, actual is ${actualCount}`)
        if (actualCount === 0) {
          replyText = replyText.replace(/\d+\s*(?:properties?|listings?|units?|options?|results?)/gi, 'No properties')
        } else {
          replyText = replyText.replace(/\d+\s*(?:properties?|listings?|units?|options?|results?)/gi, `${actualCount} ${actualCount === 1 ? 'property' : 'properties'}`)
        }
      }
    }

    // 2. Fix hallucinated property names — check for property titles that don't exist in database
    if (validPropertyTitles.length > 0) {
      const mentionedNames = replyText.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || []
      const fakeNames = mentionedNames.filter((name: string) => {
        const lower = name.toLowerCase()
        if (['the', 'this', 'that', 'what', 'here', 'your', 'our', 'his', 'her', 'you', 'we', 'they', 'sabah', 'kota', 'kinabalu', 'sandakan', 'tawau', 'lahad', 'datu', 'belud', 'tambunan', 'keningau', 'padas', 'sapi', 'rm', 'bedroom', 'bathroom', 'condominium', 'bungalow', 'villa', 'apartment', 'house', 'available', 'rented', 'type', 'price', 'location', 'size', 'status', 'sorry', 'don', 'have', 'right', 'now', 'database', 'properties', 'currently'].includes(lower)) return false
        return !validPropertyTitles.some(vt => vt?.includes(lower) || lower.includes(vt))
      })
      if (fakeNames.length > 0) {
        console.log(`[Anti-Hallucination] Fabricated names detected: ${fakeNames.join(', ')}`)
        for (const name of fakeNames) {
          replyText = replyText.replace(new RegExp(`(?:\\d+\\.\\s*\\*?|[-•]\\s*\\*?)\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\*?\\s*[-–—]`, 'gi'), '')
        }
      }
    }

    // 3. Fix hallucinated locations
    if (validLocations.length > 0) {
      const mentionedLocations = replyText.match(/(?:in|at|located in|area of)\s+([A-Za-z\s]+?)(?:\s*[.,!]|\s*$)/gi)
      if (mentionedLocations) {
        for (const loc of mentionedLocations) {
          const locName = loc.replace(/(?:in|at|located in|area of)\s+/i, '').trim().toLowerCase()
          if (locName.length > 3 && !validLocations.some(v => v?.includes(locName) || locName.includes(v))) {
            console.log(`[Anti-Hallucination] Location mismatch: mentioned "${locName}" but valid: ${validLocations.join(', ')}`)
          }
        }
      }
    }

    // 4. Nuclear option: if reply lists MORE properties than exist, replace entire reply with correct data
    const numberedItems = replyText.match(/^\s*\d+\.\s/gm) || []
    if (actualCount > 0 && numberedItems.length > actualCount) {
      console.log(`[Anti-Hallucination] Reply lists ${numberedItems.length} items but only ${actualCount} exist — replacing reply`)
      const correctList = properties.map((p: any, i: number) =>
        `${i + 1}. *${p.title}* - ${p.propertyType}, RM ${p.price}, ${p.location}, ${p.bedrooms}BR/${p.bathrooms}BA, ${p.size}sqft, ${p.status}`
      ).join('\n')
      replyText = `I currently have ${actualCount} ${actualCount === 1 ? 'property' : 'properties'} in my database:\n\n${correctList}\n\nReply with a number to see details and photos!`
    }

    // 5. Nuclear option for zero properties: if AI lists any numbered items but DB is empty
    if (actualCount === 0 && numberedItems.length > 0) {
      console.log(`[Anti-Hallucination] DB empty but AI listed ${numberedItems.length} items — replacing reply`)
      replyText = `Sorry, we don't have any properties available right now. 😔\n\nType /property to check back later, or let me know what else I can help with!`
    }

    // 6. Auto follow-up detection — check if conversation is inactive (2+ days)
    try {
      const conv = await prisma.conversation.findUnique({ where: { phone } })
      if (conv && !conv.needsHandoff) {
        const twoDaysAgo = new Date()
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
        if (conv.lastActive < twoDaysAgo && conv.followUpCount < 3) {
          console.log(`[FollowUp] Conversation ${phone} inactive for 2+ days, follow-up #${conv.followUpCount + 1}`)
        }
      }
    } catch (e) {}

    // 7. Engagement nudge — if too many messages without conversion
    const totalMsgs = conversation?.messages.length || 0
    if (totalMsgs >= 15 && !command && intent !== 'human_handoff') {
      const hasBooking = conversation?.messages.some(m =>
        m.content.toLowerCase().match(/book|booking|viewing|appointment|schedule/)
      )
      const hasContact = conversation?.messages.some(m =>
        m.content.toLowerCase().match(/\d{10,}|@|phone|email|call me/)
      )
      if (!hasBooking && !hasContact) {
        replyText += '\n\n💡 *Would you like to book a viewing or speak with Jackson directly?* Just say "book" or "talk to agent"!'
      }
    }

    return {
      text: replyText,
      intent,
      command,
      images: imagesToSend,
    }
  } catch (error: any) {
    console.error('AI Error:', error?.message || error)

    // Try Ollama fallback for ANY error
    const ollamaAvailable = await isOllamaAvailable()
    if (ollamaAvailable) {
      try {
        console.log('[AI] Trying Ollama fallback due to error:', error?.status || error?.message)
        const fallbackCompletion = await ollama.chat.completions.create({
          model: process.env.OLLAMA_MODEL || 'llama3.2',
          messages: [{ role: 'user', content: 'Hello' }],
        })
        if (fallbackCompletion) {
          return { text: '🤖 I\'m temporarily using my backup AI. The main AI service is having issues.' }
        }
      } catch (ollamaError: any) {
        console.log('[AI] Ollama fallback also failed:', ollamaError?.message)
      }
    }

    // Specific error messages
    if (error?.status === 401 || error?.status === 402) {
      return { text: 'AI service needs recharging. Please contact admin.' }
    }
    if (error?.status === 429) {
      return { text: 'Too many requests. Please try again in a moment.' }
    }

    return { text: 'Sorry, I am experiencing a technical issue. Please try again in a moment.' }
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
  const locationMatch = message.match(/(?:in|at|kat|dekat|near|nearby|area)\s+([A-Za-z\s]+?)(?:\s*\?|\s*$|\s*,)/i)
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

  // Search by area type keywords
  const areaKeywords: Record<string, string[]> = {
    beach: ['Tanjung Aru', 'Damai', 'Mengkabong', 'coastal', 'waterfront'],
    city: ['CBD', 'Likas', 'Luyang', 'Center Point', 'downtown'],
    cheap: ['Inanam', 'Sepanggar', 'Putatan', 'affordable'],
    luxury: ['Likas', 'Damai', 'waterfront', 'premium'],
    school: ['Penampang', 'Luyang', 'Likas'],
    airport: ['Sepanggar', 'Inanam', 'Menggatal'],
  }

  for (const [keyword, areas] of Object.entries(areaKeywords)) {
    if (lowerMsg.includes(keyword)) {
      where.OR = where.OR || []
      for (const area of areas) {
        where.OR.push(
          { location: { contains: area } },
          { title: { contains: area } }
        )
      }
      break
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
