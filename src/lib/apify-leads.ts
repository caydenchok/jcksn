// Apify lead scraper configuration and runner
// Handles budget limits, scheduling, and lead quality scoring

import { prisma } from './db'
import { SABAH_LOCATIONS } from './locations'

// Keywords that indicate someone wants to buy/rent — covers all of Malaysia
// (not just Sabah), with Sabah and Sarawak (East Malaysia / Borneo) called
// out explicitly as the priority markets.
// Xiaohongshu content is normally Mandarin, so this must cover Chinese
// buying/renting-intent phrasing too, not just English/Malay — 求租/求购 in
// particular are the standard Chinese phrases for "seeking to rent/buy",
// the single strongest intent signal on Chinese platforms.
const BUY_KEYWORDS = [
  'nak beli', 'want to buy', 'looking for', 'cari rumah', 'searching',
  'interested', 'berminat', 'tertarik', 'budget', 'harga', 'price',
  'condo', 'house', 'rumah', 'apartment', 'flat', 'semi-d', 'bungalow',
  'terrace', 'teres', 'villa', 'studio',
  // Sabah (priority market)
  'damai', 'likas', 'luyang', 'penampang', 'menggatal', 'inanam',
  'sepanggar', 'kota kinabalu', 'kk', 'sabah', 'sandakan', 'tawau', 'lahad datu', 'keningau',
  // Sarawak (priority market)
  'kuching', 'miri', 'sibu', 'bintulu', 'sarawak', 'samarahan', 'sarikei', 'limbang', 'sri aman',
  // Peninsular / whole Malaysia
  'kuala lumpur', 'klang valley', 'selangor', 'petaling jaya', 'shah alam', 'subang',
  'johor bahru', 'johor', 'penang', 'george town', 'ipoh', 'perak',
  'melaka', 'malacca', 'seremban', 'negeri sembilan', 'kuantan', 'pahang',
  'kedah', 'alor setar', 'kelantan', 'kota bharu', 'terengganu', 'perlis',
  'putrajaya', 'cyberjaya', 'malaysia',
  'rent', 'sewa', 'rental', 'sell', 'jual', 'for sale',
  'move', 'pindah', 'relocate', 'investment', 'pelaburan',
  'urgent', 'segera', 'need', 'perlukan',
  // Mandarin (Xiaohongshu, WeChat-style posts)
  '求租', '求购', '想买', '要买', '想租', '要租', '找房', '寻找', '寻', '找',
  '出租', '出售', '卖房', '买房', '租房', '买', '卖', '租',
  '预算', '价格', '有兴趣', '咨询', '急租', '急买', '急售', '需要', '看房',
  '公寓', '房子', '别墅', '排屋', '洋房', '单间', '服务式公寓',
  '亚庇', '沙巴', '哥打京那巴鲁', '古晋', '美里', '诗巫', '砂拉越',
  '吉隆坡', '槟城', '新山', '马来西亚',
]

// Non-English location names that won't match plain English location lists
// via .includes() — covers Sabah, Sarawak, and Peninsular Malaysia.
const LOCATION_ALIASES: { alias: string; location: string }[] = [
  // KK micro-areas renters name in posts but that aren't in the formal
  // location lists — verified from real scraped asks ("area UUC", "dekat
  // aeropod").
  { alias: 'uuc', location: 'Sepanggar (UUC)' },
  { alias: 'aeropod', location: 'Tanjung Aru' },
  { alias: '亚庇', location: 'Kota Kinabalu' },
  { alias: '哥打京那巴鲁', location: 'Kota Kinabalu' },
  { alias: '沙巴', location: 'Sabah' },
  { alias: '古晋', location: 'Kuching' },
  { alias: '美里', location: 'Miri' },
  { alias: '诗巫', location: 'Sibu' },
  { alias: '砂拉越', location: 'Sarawak' },
  { alias: '吉隆坡', location: 'Kuala Lumpur' },
  { alias: '槟城', location: 'Penang' },
  { alias: '新山', location: 'Johor Bahru' },
  { alias: '马来西亚', location: 'Malaysia' },
]

// Malaysian locations outside Sabah — Sarawak (priority, called out
// explicitly) plus major Peninsular states/cities, so a genuine Sarawak or
// KL buyer scores the same location-relevance points a Sabah one does.
// { match } is lowercase for .includes() checks; { display } is the proper-
// cased name returned by extractLocation.
const OTHER_MALAYSIA_LOCATIONS: { match: string; display: string }[] = [
  { match: 'kuching', display: 'Kuching' }, { match: 'miri', display: 'Miri' },
  { match: 'sibu', display: 'Sibu' }, { match: 'bintulu', display: 'Bintulu' },
  { match: 'kota samarahan', display: 'Kota Samarahan' }, { match: 'sarikei', display: 'Sarikei' },
  { match: 'limbang', display: 'Limbang' }, { match: 'sri aman', display: 'Sri Aman' },
  { match: 'mukah', display: 'Mukah' }, { match: 'kapit', display: 'Kapit' },
  { match: 'sarawak', display: 'Sarawak' },
  { match: 'kuala lumpur', display: 'Kuala Lumpur' }, { match: 'selangor', display: 'Selangor' },
  { match: 'petaling jaya', display: 'Petaling Jaya' }, { match: 'shah alam', display: 'Shah Alam' },
  { match: 'subang jaya', display: 'Subang Jaya' },
  { match: 'johor bahru', display: 'Johor Bahru' }, { match: 'johor', display: 'Johor' },
  { match: 'george town', display: 'George Town' }, { match: 'penang', display: 'Penang' },
  { match: 'ipoh', display: 'Ipoh' }, { match: 'perak', display: 'Perak' },
  { match: 'melaka', display: 'Melaka' }, { match: 'malacca', display: 'Melaka' },
  { match: 'seremban', display: 'Seremban' }, { match: 'negeri sembilan', display: 'Negeri Sembilan' },
  { match: 'kuantan', display: 'Kuantan' }, { match: 'pahang', display: 'Pahang' },
  { match: 'alor setar', display: 'Alor Setar' }, { match: 'kedah', display: 'Kedah' },
  { match: 'kota bharu', display: 'Kota Bharu' }, { match: 'kelantan', display: 'Kelantan' },
  { match: 'kuala terengganu', display: 'Kuala Terengganu' }, { match: 'terengganu', display: 'Terengganu' },
  { match: 'perlis', display: 'Perlis' }, { match: 'putrajaya', display: 'Putrajaya' },
]

function mentionsSabahLocation(lowerText: string): boolean {
  if (SABAH_LOCATIONS.some(loc => lowerText.includes(loc.name.toLowerCase()))) return true
  if (OTHER_MALAYSIA_LOCATIONS.some(loc => lowerText.includes(loc.match))) return true
  return LOCATION_ALIASES.some(a => lowerText.includes(a.alias))
}

// Score a lead based on quality signals + freshness
export function scoreLead(lead: {
  name?: string
  phone?: string
  email?: string
  message?: string
  location?: string
  budget?: string
  requirement?: string
}, postedAt?: Date | null): number {
  let score = 0

  // Has phone number (high value)
  if (lead.phone && lead.phone.length >= 10) score += 30

  // Has email
  if (lead.email && lead.email.includes('@')) score += 15

  // Has name
  if (lead.name && lead.name.length > 2) score += 10

  // Message mentions KK location
  const msg = (lead.message || '').toLowerCase()
  if (mentionsSabahLocation(msg)) score += 20

  // Message mentions budget (incl. Chinese "万" pricing, e.g. "50万")
  if (lead.budget || msg.match(/\d+k|\d+m|rm\s*\d|\d+\s*万/)) score += 15

  // Message mentions property type (incl. Chinese terms)
  if (lead.requirement || msg.match(/condo|house|rumah|apartment|semi|bungalow|公寓|房子|别墅|排屋|洋房/)) score += 10

  // Message has buying intent
  const hasIntent = BUY_KEYWORDS.some(kw => msg.includes(kw))
  if (hasIntent) score += 15

  // Recency bonus: fresh intent is hot intent
  if (postedAt) {
    const daysAgo = (Date.now() - postedAt.getTime()) / (1000 * 60 * 60 * 24)
    if (daysAgo <= 3) score += 20   // posted within 3 days = very hot
    else if (daysAgo <= 7) score += 10 // within a week = still fresh
    else if (daysAgo <= 14) score += 5  // within 2 weeks = moderate
  }

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
    // No longer default to Kota Kinabalu — we now cover all of Malaysia, so
    // an unmatched location should stay blank rather than mislabel a
    // Sarawak/KL/other lead as being in Sabah.
    location,
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
  // "50万" / "预算80万" (Chinese prices are commonly quoted in units of
  // 10,000 — "50万" = RM500,000) checked first since it has no English
  // equivalent keyword to anchor on.
  const zhBudgetRegex = /(?:预算)?\s*[\d,.]+\s*万/
  const zhMatch = text.match(zhBudgetRegex)
  if (zhMatch) return zhMatch[0].trim()

  // "bajet" is how Malay posts actually spell it ("bajet 500-550"), and
  // amounts are often ranges or monthly phrasing ("sewa sebulan 700-900",
  // "bulanan 850") — capture the range, not just the first number.
  const budgetRegex = /(?:rm|budget|bajet|harga|sebulan|bulanan|under|bawah|below)\s*(?:rm\s*)?[\d,.]+(?:\s*(?:-|hingga|to)\s*[\d,.]+)?(?:k|m)?/gi
  const matches = text.match(budgetRegex)
  return matches ? matches[0].trim() : ''
}

function extractRequirement(text: string): string {
  const requirements: string[] = []
  const lower = text.toLowerCase() // .toLowerCase() is a no-op on CJK text, safe to reuse

  if (lower.match(/condo|apartment|flat|公寓/)) requirements.push('Condo')
  if (lower.match(/house|rumah|terrace|teres|房子|排屋/)) requirements.push('House')
  if (lower.match(/semi|semi-d/)) requirements.push('Semi-D')
  if (lower.match(/bungalow|别墅|洋房/)) requirements.push('Bungalow')
  if (lower.match(/studio|单间/)) requirements.push('Studio')
  // Note: \b word boundaries don't work around CJK characters in JS regex
  // (no ASCII transition = no boundary), so Chinese terms are matched as
  // plain substrings instead.
  if (lower.match(/rent|sewa|求租|出租|租房|租/)) requirements.push('For Rent')
  if (lower.match(/buy|beli|sale|jual|求购|买房|卖房|买|卖/)) requirements.push('For Sale')
  if (lower.match(/(\d+)\s*(?:bed|br|bilik)/)) {
    const m = lower.match(/(\d+)\s*(?:bed|br|bilik)/)
    if (m) requirements.push(`${m[1]} BR`)
  }
  if (lower.match(/(\d+)\s*房/)) {
    const m = lower.match(/(\d+)\s*房/)
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
  for (const loc of OTHER_MALAYSIA_LOCATIONS) {
    if (lower.includes(loc.match)) return loc.display
  }
  for (const a of LOCATION_ALIASES) {
    if (lower.includes(a.alias)) return a.location
  }
  return ''
}


