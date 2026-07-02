// Apify lead scraper configuration and runner
// Handles budget limits, scheduling, and lead quality scoring

import { prisma } from './db'
import { SABAH_LOCATIONS } from './locations'

export interface ApifyConfig {
  apiKey: string
  dailyBudgetMYR: number
  lastRunDate: string | null
  totalSpentToday: number
  leadsCollectedToday: number
  isRunning: boolean
}

// Keywords that indicate someone wants to buy/rent in KK
const BUY_KEYWORDS = [
  'nak beli', 'want to buy', 'looking for', 'cari rumah', 'searching',
  'interested', 'berminat', 'tertarik', 'budget', 'harga', 'price',
  'condo', 'house', 'rumah', 'apartment', 'flat', 'semi-d', 'bungalow',
  'terrace', 'teres', 'villa', 'studio',
  'damai', 'likas', 'luyang', 'penampang', 'menggatal', 'inanam',
  'sepanggar', 'kota kinabalu', 'kk', 'sabah',
  'rent', 'sewa', 'rental', 'sell', 'jual', 'for sale',
  'move', 'pindah', 'relocate', 'investment', 'pelaburan',
  'urgent', 'segera', 'need', 'perlukan',
]

// Approximate cost per scrape (Apify actors)
const COST_PER_SCRAPE = {
  'facebook-posts': 0.005, // ~$0.005 per post scraped
  'facebook-comments': 0.003, // ~$0.003 per comment
  'instagram-posts': 0.004, // ~$0.004 per post
}

// Estimated cost in MYR (1 USD = ~4.5 MYR)
function estimateCost(itemsCount: number, actorType: string): number {
  const costPerItem = COST_PER_SCRAPE[actorType as keyof typeof COST_PER_SCRAPE] || 0.005
  return itemsCount * costPerItem * 4.5 // Convert USD to MYR
}

// Score a lead based on quality signals
export function scoreLead(lead: {
  name?: string
  phone?: string
  email?: string
  message?: string
  location?: string
  budget?: string
  requirement?: string
}): number {
  let score = 0

  // Has phone number (high value)
  if (lead.phone && lead.phone.length >= 10) score += 30

  // Has email
  if (lead.email && lead.email.includes('@')) score += 15

  // Has name
  if (lead.name && lead.name.length > 2) score += 10

  // Message mentions KK location
  const msg = (lead.message || '').toLowerCase()
  if (SABAH_LOCATIONS.some(loc => msg.includes(loc.name.toLowerCase()))) score += 20

  // Message mentions budget
  if (lead.budget || msg.match(/\d+k|\d+m|rm\s*\d/)) score += 15

  // Message mentions property type
  if (lead.requirement || msg.match(/condo|house|rumah|apartment|semi|bungalow/)) score += 10

  // Message has buying intent
  const hasIntent = BUY_KEYWORDS.some(kw => msg.includes(kw))
  if (hasIntent) score += 15

  return Math.min(score, 100)
}

// Parse Facebook/Instagram text and extract lead info
export function extractLeadFromText(text: string, source: string): {
  name: string
  phone: string
  email: string
  message: string
  location: string
  budget: string
  requirement: string
} {
  const phone = extractPhone(text)
  const email = extractEmail(text)
  const budget = extractBudget(text)
  const requirement = extractRequirement(text)
  const location = extractLocation(text)

  return {
    name: '',
    phone,
    email,
    message: text.substring(0, 500),
    location: location || 'Kota Kinabalu',
    budget,
    requirement,
  }
}

function extractPhone(text: string): string {
  const phoneRegex = /(?:\+?6?0?1[0-9][-\s]?\d{3,4}[-\s]?\d{4}|01[0-9][-\s]?\d{3,4}[-\s]?\d{4})/g
  const matches = text.match(phoneRegex)
  return matches ? matches[0].replace(/\s/g, '') : ''
}

function extractEmail(text: string): string {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  const matches = text.match(emailRegex)
  return matches ? matches[0] : ''
}

function extractBudget(text: string): string {
  const budgetRegex = /(?:rm|budget|harga|under|bawah|below)\s*[\d,.]+(?:k|m)?/gi
  const matches = text.match(budgetRegex)
  return matches ? matches[0] : ''
}

function extractRequirement(text: string): string {
  const requirements: string[] = []
  const lower = text.toLowerCase()

  if (lower.match(/condo|apartment|flat/)) requirements.push('Condo')
  if (lower.match(/house|rumah|terrace|teres/)) requirements.push('House')
  if (lower.match(/semi|semi-d/)) requirements.push('Semi-D')
  if (lower.match(/bungalow/)) requirements.push('Bungalow')
  if (lower.match(/studio/)) requirements.push('Studio')
  if (lower.match(/rent|sewa/)) requirements.push('For Rent')
  if (lower.match(/buy|beli|sale|jual/)) requirements.push('For Sale')
  if (lower.match(/(\d+)\s*(?:bed|br|bilik)/)) {
    const m = lower.match(/(\d+)\s*(?:bed|br|bilik)/)
    if (m) requirements.push(`${m[1]} BR`)
  }

  return requirements.join(', ')
}

function extractLocation(text: string): string {
  const lower = text.toLowerCase()
  for (const loc of SABAH_LOCATIONS) {
    if (lower.includes(loc.name.toLowerCase()) || lower.includes(loc.district.toLowerCase())) {
      return loc.name
    }
  }
  return ''
}

// Get Apify config from a settings file or database
export function getApifyConfig(): ApifyConfig {
  // In a real app, this would come from a database
  // For now, use environment variables + defaults
  return {
    apiKey: process.env.APIFY_TOKEN || '',
    dailyBudgetMYR: parseFloat(process.env.APIFY_DAILY_BUDGET || '30'),
    lastRunDate: null,
    totalSpentToday: 0,
    leadsCollectedToday: 0,
    isRunning: false,
  }
}

// Check if we're within budget
export function isWithinBudget(config: ApifyConfig): boolean {
  return config.totalSpentToday < config.dailyBudgetMYR
}

// Calculate how many items we can scrape today
export function calculateRemainingBudget(config: ApifyConfig): number {
  return Math.max(0, config.dailyBudgetMYR - config.totalSpentToday)
}
