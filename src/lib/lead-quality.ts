export interface LeadQuality {
  score: number // 0-100
  tier: 'hot' | 'warm' | 'cold' | 'time_waster'
  signals: string[]
  suggestion: string
}

const SERIOUS_SIGNALS = [
  /how much|berapa|price|harga/i,
  /book|booking|view|visit|survey|nak tengok/i,
  /bedroom|bilik|br\b/i,
  /location|area|where|kat mana|di mana/i,
  /budget|afford|loan|mortgage/i,
  /buy|beli|purchase|invest/i,
  /rent|sewa|sewal/i,
  /serious|betul|really|memang/i,
  /agent|ren|negotiator/i,
  /phone|number|call|hubungi/i,
  /schedule|date|time|appointment/i,
]

const TIME_WASTER_SIGNALS = [
  /^(hi|hello|hii|hey|yo|sup|ha|he|ho|ok|yes|no|bye|ah|eh|oh|um|uh|lol|haha|hehe|lmao|omg|wow|nice|cool|great|good|fine|sure|yep|nah|meh|dunno|idk|nvm|brb|ttyl)$/i,
  /test|testing|try|cuba/i,
  /bored|bosan|nothing|无聊/i,
  /random|whatever|anything/i,
  /joke|lawak|funny|kelakar/i,
]

const CONVERSION_SIGNALS = [
  /send.*number|share.*contact|phone.*number|hubungi/i,
  /whatsapp|wa\b|wechat/i,
  /email|emel/i,
  /name|nama/i,
  /address|alamat/i,
]

export function analyzeLeadQuality(
  message: string,
  messageCount: number,
  conversationHistory: { role: string; content: string }[]
): LeadQuality {
  let score = 50 // baseline
  const signals: string[] = []

  // Check current message
  const msg = message.toLowerCase()

  // Serious signals (+10 each)
  for (const pattern of SERIOUS_SIGNALS) {
    if (pattern.test(msg)) {
      score += 10
      signals.push('property_interest')
      break
    }
  }

  // Conversion signals (+15 each)
  for (const pattern of CONVERSION_SIGNALS) {
    if (pattern.test(msg)) {
      score += 15
      signals.push('conversion_intent')
      break
    }
  }

  // Time-waster signals (-15 each)
  for (const pattern of TIME_WASTER_SIGNALS) {
    if (pattern.test(msg)) {
      score -= 15
      signals.push('low_engagement')
      break
    }
  }

  // Message count analysis
  if (messageCount <= 2) {
    signals.push('new_conversation')
  } else if (messageCount >= 10) {
    // Check if they've shown ANY serious intent in history
    const historyText = conversationHistory.map(m => m.content).join(' ').toLowerCase()
    const hasSeriousIntent = SERIOUS_SIGNALS.some(p => p.test(historyText))
    if (!hasSeriousIntent) {
      score -= 20
      signals.push('excessive_chat_no_intent')
    } else {
      score += 10
      signals.push('engaged_buyer')
    }
  }

  // Message length analysis
  if (msg.length < 5) {
    score -= 10
    signals.push('short_reply')
  } else if (msg.length > 50) {
    score += 10
    signals.push('detailed_inquiry')
  }

  // Cap score
  score = Math.max(0, Math.min(100, score))

  // Determine tier
  let tier: LeadQuality['tier']
  let suggestion: string

  if (score >= 70) {
    tier = 'hot'
    suggestion = 'High intent — offer booking or direct agent contact'
  } else if (score >= 50) {
    tier = 'warm'
    suggestion = 'Show properties, ask about preferences'
  } else if (score >= 30) {
    tier = 'cold'
    suggestion = 'Engage with value — show best listings, ask questions'
  } else {
    tier = 'time_waster'
    suggestion = 'Gently redirect to CTA or end conversation politely'
  }

  return { score, tier, signals, suggestion }
}

export function getEngagementResponse(tier: LeadQuality['tier'], messageCount: number): string | null {
  if (tier === 'time_waster' && messageCount >= 5) {
    const responses = [
      "Hey! Just checking — are you looking for a property in Sabah? I can help you find the perfect one! 🏠",
      "I notice you've been chatting for a while. Would you like me to show you our latest listings?",
      "If you're just exploring, no worries! But if you're serious about finding a home, I can help — just tell me what you're looking for 😊",
      "Quick question — are you currently looking to buy or rent? I have some great options in KK!",
    ]
    return responses[Math.floor(Math.random() * responses.length)]
  }

  if (tier === 'cold' && messageCount >= 8) {
    return "By the way, I have some exclusive listings that just came in! Want me to show you the best ones in your budget?"
  }

  return null
}
