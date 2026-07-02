/**
 * Facebook Lead Scraper for Kota Kinabalu Property
 * 
 * Usage:
 * 1. Install Apify CLI: npm install -g apify-cli
 * 2. Login: apify login
 * 3. Run: node scripts/scrape-facebook-leads.js
 * 
 * This scrapes Facebook groups and pages for people looking for
 * property in Kota Kinabalu, Sabah.
 */

const APIFY_TOKEN = process.env.APIFY_TOKEN || 'YOUR_APIFY_TOKEN_HERE'

// Facebook groups/pages to scrape for KK property leads
const TARGETS = [
  // Property groups
  { type: 'group', url: 'https://www.facebook.com/groups/sabahpropertyforsale', name: 'Sabah Property For Sale' },
  { type: 'group', url: 'https://www.facebook.com/groups/sabahproperty', name: 'Sabah Property' },
  { type: 'group', url: 'https://www.facebook.com/groups/kotakinabaluproperty', name: 'Kota Kinabalu Property' },
  { type: 'group', url: 'https://www.facebook.com/groups/propertysabah', name: 'Property Sabah' },
  { type: 'group', url: 'https://www.facebook.com/groups/rumahsabah', name: 'Rumah Sabah' },
  { type: 'group', url: 'https://www.facebook.com/groups/sabahrental', name: 'Sabah Rental' },
  
  // Property pages
  { type: 'page', url: 'https://www.facebook.com/Zero88Property', name: 'Zero88 Property (own)' },
]

// Keywords that indicate someone wants to buy/rent
const BUY_KEYWORDS = [
  'nak beli', 'want to buy', 'looking for', 'cari rumah', 'searching',
  'interested', 'berminat', 'tertarik', 'budget', 'harga', 'price',
  'rm ', 'under rm', 'bawah rm', 'di bawah', 'below rm',
  'condo', 'house', 'rumah', 'apartment', 'flat', 'semi-d', 'bungalow',
  'terrace', 'teres', 'villa', 'studio', 'penthouse',
  'damai', 'likas', 'luyang', 'penampang', 'menggatal', 'inanam',
  'sepanggar', 'kota kinabalu', 'kk', 'sabah',
  'bedroom', 'bilik', 'bed', 'br', 'bath', 'bathroom',
  'rent', 'sewa', 'rental', ' sewa',
  'sell', 'jual', 'for sale', 'untuk dijual',
  'move', 'pindah', 'relocate', 'transfer',
  'investment', 'pelaburan', 'invest',
  'urgent', 'segera', 'need', 'perlukan',
]

async function scrapeFacebookLeads() {
  console.log('🔍 Starting Facebook lead scraping for Kota Kinabalu property...\n')
  
  const allLeads = []
  
  for (const target of TARGETS) {
    console.log(`📱 Scraping: ${target.name} (${target.url})`)
    
    try {
      const leads = await scrapeFacebookPage(target.url)
      allLeads.push(...leads)
      console.log(`   ✅ Found ${leads.length} potential leads`)
    } catch (err) {
      console.error(`   ❌ Error scraping ${target.name}:`, err.message)
    }
  }
  
  // Filter for quality leads
  const qualityLeads = filterQualityLeads(allLeads)
  console.log(`\n📊 Results:`)
  console.log(`   Total scraped: ${allLeads.length}`)
  console.log(`   Quality leads: ${qualityLeads.length}`)
  
  // Save to file
  const fs = require('fs')
  const filename = `leads-facebook-${new Date().toISOString().split('T')[0]}.json`
  fs.writeFileSync(filename, JSON.stringify(qualityLeads, null, 2))
  console.log(`\n💾 Saved to ${filename}`)
  
  return qualityLeads
}

async function scrapeFacebookPage(url) {
  const actorId = 'apify/facebook-posts-scraper'
  
  const input = {
    startUrls: [{ url }],
    maxItems: 50,
    includeComments: true,
    commentsSortOrder: 'recent',
  }
  
  const response = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  
  if (!response.ok) {
    throw new Error(`Apify API error: ${response.status}`)
  }
  
  const run = await response.json()
  
  // Wait for completion
  const runId = run.data.id
  let status = 'running'
  while (status === 'running') {
    await new Promise(r => setTimeout(r, 5000))
    const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`)
    const statusData = await statusRes.json()
    status = statusData.data.status
  }
  
  // Get results
  const datasetId = run.data.defaultDatasetId
  const resultsRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&format=json`)
  const results = await resultsRes.json()
  
  return results.map(post => ({
    name: post.authorName || '',
    phone: extractPhone(post.text || ''),
    email: extractEmail(post.text || ''),
    message: (post.text || '').substring(0, 500),
    source: 'facebook',
    location: 'Kota Kinabalu',
    budget: extractBudget(post.text || ''),
    requirement: extractRequirement(post.text || ''),
    profileUrl: post.authorProfileUrl || post.profileUrl || '',
    nameVerified: false,
    postUrl: post.url || '',
    postDate: post.time || '',
    likes: post.likes || 0,
    comments: post.comments || 0,
  }))
}

function filterQualityLeads(leads) {
  return leads.filter(lead => {
    const text = (lead.message || '').toLowerCase()
    
    // Must mention buying/renting intent
    const hasIntent = BUY_KEYWORDS.some(kw => text.includes(kw.toLowerCase()))
    if (!hasIntent) return false
    
    // Must have contact info
    const hasContact = lead.phone || lead.email
    if (!hasContact) return false
    
    return true
  })
}

function extractPhone(text) {
  const phoneRegex = /(?:\+?6?0?1[0-9][-\s]?\d{3,4}[-\s]?\d{4}|01[0-9][-\s]?\d{3,4}[-\s]?\d{4})/g
  const matches = text.match(phoneRegex)
  return matches ? matches[0].replace(/\s/g, '') : ''
}

function extractEmail(text) {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  const matches = text.match(emailRegex)
  return matches ? matches[0] : ''
}

function extractBudget(text) {
  const budgetRegex = /(?:rm|budget|harga|under|bawah|below)\s*[\d,.]+(?:k|m)?/gi
  const matches = text.match(budgetRegex)
  return matches ? matches[0] : ''
}

function extractRequirement(text) {
  const requirements = []
  const lower = text.toLowerCase()
  
  if (lower.includes('condo') || lower.includes('apartment')) requirements.push('Condo')
  if (lower.includes('house') || lower.includes('rumah') || lower.includes('terrace') || lower.includes('teres')) requirements.push('House')
  if (lower.includes('semi') || lower.includes('semi-d')) requirements.push('Semi-D')
  if (lower.includes('bungalow')) requirements.push('Bungalow')
  if (lower.includes('studio')) requirements.push('Studio')
  if (lower.includes('rent') || lower.includes('sewa')) requirements.push('For Rent')
  if (lower.includes('buy') || lower.includes('beli') || lower.includes('sale')) requirements.push('For Sale')
  if (lower.match(/\d+\s*(?:bed|br|bilik)/)) {
    const bedMatch = lower.match(/(\d+)\s*(?:bed|br|bilik)/)
    if (bedMatch) requirements.push(`${bedMatch[1]} Bedroom`)
  }
  
  return requirements.join(', ')
}

async function importToLeads(leads) {
  console.log('\n📤 Importing leads to your system...')
  
  const res = await fetch('http://localhost:3000/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(leads),
  })
  
  const result = await res.json()
  console.log(`✅ Imported ${result.imported} new leads`)
  return result
}

// Run
if (require.main === module) {
  scrapeFacebookLeads()
    .then(leads => {
      console.log('\n💡 To import leads to your dashboard, run:')
      console.log(`   node -e "const leads=require('./leads-facebook-${new Date().toISOString().split('T')[0]}.json');fetch('http://localhost:3000/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(leads)}).then(r=>r.json()).then(d=>console.log(d))"`)
    })
    .catch(console.error)
}

module.exports = { scrapeFacebookLeads, filterQualityLeads, importToLeads }
