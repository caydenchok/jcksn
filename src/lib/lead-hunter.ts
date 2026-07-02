// Lead Hunter - Proactively find and predict potential property buyers/renters
// Uses behavioral signals to identify high-intent prospects

import { prisma } from './db'
import { scoreLead } from './apify-leads'

// Behavioral signals that predict property intent
export interface LeadSignal {
  source: string
  signal: string
  confidence: number // 0-100
  phone?: string
  name?: string
  email?: string
  platform: string
  metadata?: any
}

// Signal types and their intent scores
const SIGNAL_SCORES: Record<string, number> = {
  // High intent signals (someone actively looking)
  'searched_property': 90,
  'viewed_listings': 85,
  'inquired_price': 80,
  'asked_about_viewing': 85,
  'visited_property_page': 70,
  'asked_about_mortgage': 75,
  'mentioned_budget': 65,
  'asked_about_location': 60,
  
  // Medium intent signals (showing interest)
  'liked_property_post': 40,
  'commented_property_post': 50,
  'shared_property_post': 45,
  'followed_property_page': 35,
  'engaged_property_content': 30,
  
  // Life event signals (likely to move)
  'new_job': 60,
  'got_married': 55,
  'baby_on_way': 70,
  'graduated': 45,
  'relocated': 75,
  'promotion': 50,
  
  // Financial signals (ability to buy)
  'high_income': 60,
  'savings_increase': 50,
  'pre_approved_loan': 80,
  
  // Negative signals (not ready)
  'recently_bought': 20,
  'recently_sold': 30,
  'just_signed_lease': 15,
}

// Platforms we can monitor
export const MONITOR_SOURCES = [
  { id: 'facebook_groups', name: 'Facebook Groups', icon: 'FB', cost: 0.003 },
  { id: 'facebook_comments', name: 'Facebook Comments', icon: 'FB', cost: 0.002 },
  { id: 'instagram_engagement', name: 'Instagram Engagement', icon: 'IG', cost: 0.004 },
  { id: 'website_visitors', name: 'Website Visitors', icon: 'WEB', cost: 0 },
  { id: 'property_portals', name: 'Property Portals', icon: 'PG', cost: 0.01 },
  { id: 'google_search', name: 'Google Search Trends', icon: 'G', cost: 0 },
]

// Keywords that indicate high purchase intent
const HIGH_INTENT_KEYWORDS = [
  // Direct purchase intent
  'nak beli', 'want to buy', 'looking to buy', 'ready to buy', 'budget ready',
  'cari rumah', 'searching for house', 'hunting for property',
  'viewing', 'survey', 'nak tengok', 'want to see',
  'booking', 'booking slot', 'appointment',
  
  // Financial readiness
  'loan approved', 'loan ready', 'pre-approved', 'down payment ready',
  'duit cukup', 'budget ready', 'duit dah ada',
  
  // Urgency signals
  'urgent', 'segera', 'need now', 'perlukan segera',
  'deadline', 'before', 'before end of', 'sebelum',
  'moving soon', 'pindah soon', 'relocating',
  
  // Specific property requests
  'condo di', 'house di', 'rumah di', 'property di',
  'rent di', 'sewa di', 'for rent in',
  'near school', 'near beach', 'near city',
  '3 bedroom', '4 bedroom', '3 bilik', '4 bilik',
]

// Location signals (people in KK area)
const LOCATION_SIGNALS = [
  'kota kinabalu', 'kk', 'sabah', 'damai', 'likas', 'luyang',
  'penampang', 'menggatal', 'inanam', 'sepanggar', 'tuaran',
]

// Life event detection patterns
const LIFE_EVENT_PATTERNS = [
  { pattern: /(?:new job|kerja baru| baru pindah|relocating|transfer)/i, event: 'new_job', score: 60 },
  { pattern: /(?:married|kahwin|berkahwin|kawin|newlywed|baru kahwin)/i, event: 'got_married', score: 55 },
  { pattern: /(?:baby|anak|hamil|pregnant|expecting|baru lahir)/i, event: 'baby_on_way', score: 70 },
  { pattern: /(?:graduated|graduate| baru habis study|degree)/i, event: 'graduated', score: 45 },
  { pattern: /(?:promotion|promoted|naik pangkat|gaji naik)/i, event: 'promotion', score: 50 },
  { pattern: /(?:inherited|warisan|dapat harta)/i, event: 'inheritance', score: 65 },
]

export interface LeadPrediction {
  phone: string
  name: string
  email: string
  platform: string
  intentScore: number
  signals: LeadSignal[]
  suggestedAction: 'call_now' | 'send_message' | 'add_to_nurture' | 'ignore'
  suggestedMessage: string
  propertyMatch?: string
  estimatedBudget?: string
  preferredLocation?: string
}

// Analyze text for purchase intent
export function analyzeTextIntent(text: string, source: string): LeadSignal[] {
  const signals: LeadSignal[] = []
  const lower = text.toLowerCase()
  
  // Check for high intent keywords
  for (const keyword of HIGH_INTENT_KEYWORDS) {
    if (lower.includes(keyword.toLowerCase())) {
      signals.push({
        source,
        signal: `Mentioned: "${keyword}"`,
        confidence: 70,
        platform: source,
      })
    }
  }
  
  // Check for location mentions
  for (const loc of LOCATION_SIGNALS) {
    if (lower.includes(loc)) {
      signals.push({
        source,
        signal: `Location mentioned: ${loc}`,
        confidence: 50,
        platform: source,
      })
    }
  }
  
  // Check for life events
  for (const { pattern, event, score } of LIFE_EVENT_PATTERNS) {
    if (pattern.test(text)) {
      signals.push({
        source,
        signal: `Life event: ${event}`,
        confidence: score,
        platform: source,
      })
    }
  }
  
  // Check for budget mentions
  const budgetMatch = text.match(/(?:budget|harga|rm|under|bawah)\s*[\d,.]+(?:k|m)?/i)
  if (budgetMatch) {
    signals.push({
      source,
      signal: `Budget mentioned: ${budgetMatch[0]}`,
      confidence: 60,
      platform: source,
    })
  }
  
  return signals
}

// Predict lead quality from multiple signals
export function predictLeadQuality(signals: LeadSignal[]): {
  score: number
  action: 'call_now' | 'send_message' | 'add_to_nurture' | 'ignore'
  reason: string
} {
  if (signals.length === 0) {
    return { score: 0, action: 'ignore', reason: 'No signals detected' }
  }
  
  // Calculate weighted average confidence
  const totalConfidence = signals.reduce((sum, s) => sum + s.confidence, 0)
  const avgConfidence = totalConfidence / signals.length
  
  // Bonus for multiple signals
  const signalBonus = Math.min(signals.length * 5, 20)
  const score = Math.min(avgConfidence + signalBonus, 100)
  
  // Determine action based on score
  let action: 'call_now' | 'send_message' | 'add_to_nurture' | 'ignore'
  let reason: string
  
  if (score >= 80) {
    action = 'call_now'
    reason = 'High intent — multiple strong signals detected'
  } else if (score >= 60) {
    action = 'send_message'
    reason = 'Medium intent — worth reaching out'
  } else if (score >= 40) {
    action = 'add_to_nurture'
    reason = 'Low intent — add to marketing list'
  } else {
    action = 'ignore'
    reason = 'Very low intent — not worth pursuing now'
  }
  
  return { score, action, reason }
}

// Generate personalized outreach message based on signals
export function generateOutreachMessage(prediction: LeadPrediction): string {
  const name = prediction.name || 'there'
  
  // Different messages based on detected signals
  if (prediction.signals.some(s => s.signal.includes('new_job'))) {
    return `Hi ${name}! 👋 Congrats on the new job! 🎉\n\nI'm Jackson Liew from ZERO88 Property. I noticed you might be looking for a place in KK.\n\nI have some great options near your area. Want me to send you a few listings?\n\nReply YES and I'll send you my best picks! 🏠`
  }
  
  if (prediction.signals.some(s => s.signal.includes('got_married'))) {
    return `Hi ${name}! 👋 Congrats on your wedding! 🎉💍\n\nI'm Jackson Liew from ZERO88 Property. Starting a new chapter together? I can help you find the perfect home.\n\nReply YES and I'll send you some options! 🏠`
  }
  
  if (prediction.signals.some(s => s.signal.includes('baby'))) {
    return `Hi ${name}! 👋 Congrats on the new addition! 👶\n\nI'm Jackson Liew from ZERO88 Property. Need more space for your growing family? I have some great family homes available.\n\nReply YES and I'll send you my best picks! 🏠`
  }
  
  if (prediction.preferredLocation) {
    return `Hi ${name}! 👋 I'm Jackson Liew from ZERO88 Property.\n\nI noticed you're interested in ${prediction.preferredLocation}. I have some exclusive listings there that might interest you.\n\nWant me to send you a few options? Reply YES! 🏠`
  }
  
  if (prediction.estimatedBudget) {
    return `Hi ${name}! 👋 I'm Jackson Liew from ZERO88 Property.\n\nI have properties within your budget range. Let me send you some great options that fit your needs.\n\nReply YES and I'll share my best picks! 🏠`
  }
  
  return `Hi ${name}! 👋 I'm Jackson Liew, a property agent in Kota Kinabalu.\n\nI help people find their dream homes in Sabah. Whether you're looking to buy, sell, or rent — I can help!\n\nReply YES if you'd like to know more about available properties. 🏠`
}

// Save a predicted lead to database
export async function savePredictedLead(prediction: LeadPrediction) {
  try {
    const lead = await prisma.lead.create({
      data: {
        name: prediction.name,
        phone: prediction.phone || '',
        email: prediction.email || '',
        source: prediction.platform,
        message: prediction.signals.map(s => s.signal).join('; '),
        location: prediction.preferredLocation || '',
        budget: prediction.estimatedBudget || '',
        requirement: prediction.propertyMatch || '',
        status: 'new',
        notes: `Auto-hunted. Score: ${prediction.intentScore}/100. Action: ${prediction.suggestedAction}. Reason: ${prediction.signals[0]?.signal || 'detected'}`,
      },
    })
    console.log(`[Hunter] Saved lead: ${prediction.name || prediction.phone} (Score: ${prediction.intentScore})`)
    return lead
  } catch (error) {
    console.error('[Hunter] Error saving lead:', error)
    return null
  }
}

// Main hunting function - analyze a batch of potential leads
export async function huntLeads(items: Array<{
  text: string
  phone?: string
  name?: string
  email?: string
  source: string
}>): Promise<LeadPrediction[]> {
  const predictions: LeadPrediction[] = []
  
  for (const item of items) {
    // Analyze the text
    const signals = analyzeTextIntent(item.text, item.source)
    
    if (signals.length === 0) continue
    
    // Predict quality
    const { score, action, reason } = predictLeadQuality(signals)
    
    if (score < 30) continue // Skip very low quality
    
    // Extract location from signals
    const locationSignal = signals.find(s => s.signal.includes('Location mentioned:'))
    const preferredLocation = locationSignal?.signal.replace('Location mentioned: ', '') || ''
    
    // Extract budget from signals
    const budgetSignal = signals.find(s => s.signal.includes('Budget mentioned:'))
    const estimatedBudget = budgetSignal?.signal.replace('Budget mentioned: ', '') || ''
    
    const prediction: LeadPrediction = {
      phone: item.phone || '',
      name: item.name || '',
      email: item.email || '',
      platform: item.source,
      intentScore: score,
      signals,
      suggestedAction: action,
      suggestedMessage: generateOutreachMessage({
        name: item.name,
        signals,
        preferredLocation,
        estimatedBudget,
      } as LeadPrediction),
      preferredLocation,
      estimatedBudget,
    }
    
    predictions.push(prediction)
    
    // Auto-save high-quality leads
    if (score >= 60) {
      await savePredictedLead(prediction)
    }
  }
  
  // Sort by score (highest first)
  predictions.sort((a, b) => b.intentScore - a.intentScore)
  
  return predictions
}
