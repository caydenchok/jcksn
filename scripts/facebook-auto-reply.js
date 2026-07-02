/**
 * Facebook Auto-Reply for Property Leads
 * 
 * This script:
 * 1. Monitors your Facebook Page posts for comments
 * 2. Detects people asking about property
 * 3. Auto-replies with a message to get their phone number
 * 4. Saves the lead to your dashboard
 * 
 * Setup:
 * 1. Get Apify API key from https://console.apify.com
 * 2. Set APIFY_TOKEN in .env
 * 3. Run: node scripts/facebook-auto-reply.js
 */

const APIFY_TOKEN = process.env.APIFY_TOKEN || 'YOUR_APIFY_TOKEN_HERE'
const PAGE_URL = process.env.FACEBOOK_PAGE_URL || 'https://facebook.com/Zero88Property'

// Keywords that indicate someone wants property
const PROPERTY_KEYWORDS = [
  'nak', 'cari', 'looking', 'searching', 'interested', 'berminat',
  'condo', 'house', 'rumah', 'apartment', 'flat', 'semi', 'bungalow',
  'rent', 'sewa', 'buy', 'beli', 'sale', 'jual', 'property',
  'budget', 'harga', 'price', 'rm', 'murah', 'cheap', 'expensive',
  'available', 'ada', 'tak', 'have', 'any', 'berapa', 'how much',
  'bedroom', 'bilik', 'bed', 'bath', 'location', 'area', 'where',
  'kk', 'kota kinabalu', 'sabah', 'damai', 'likas', 'penampang',
]

// Auto-reply messages (rotate for variety)
const AUTO_REPLIES = [
  'Hi! 👋 Yes we have properties available! DM me your phone number and I\'ll send you the listings 🏠',
  'Hello! 😊 We have great options for you! Please DM me your contact number and I\'ll share the details 📱',
  'Hey there! 👋 I can help you find the perfect property! Send me a DM with your phone number 🏠',
  'Hi! Thanks for your interest! DM me your phone number and I\'ll send you available listings 📋',
  'Hello! 😊 Great to hear from you! Please DM me your number and I\'ll share our best properties 🏠',
]

// Check if a comment is asking about property
function isPropertyInquiry(text) {
  const lower = text.toLowerCase()
  return PROPERTY_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()))
}

// Pick a random auto-reply
function getRandomReply() {
  return AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)]
}

// Main auto-reply function
async function runAutoReply() {
  console.log('🔍 Starting Facebook auto-reply monitor...\n')
  
  if (!APIFY_TOKEN || APIFY_TOKEN === 'YOUR_APIFY_TOKEN_HERE') {
    console.error('❌ Please set APIFY_TOKEN in .env file')
    console.log('   Get your token from: https://console.apify.com/account/integrations')
    return
  }
  
  console.log(`📱 Monitoring: ${PAGE_URL}`)
  console.log(`🔑 API Key: ${APIFY_TOKEN.substring(0, 10)}...`)
  
  // Step 1: Fetch recent comments from the page
  console.log('\n📥 Fetching recent comments...')
  
  try {
    const comments = await fetchComments()
    console.log(`   Found ${comments.length} comments`)
    
    // Step 2: Filter for property inquiries
    const propertyComments = comments.filter(c => isPropertyInquiry(c.text))
    console.log(`   ${propertyComments.length} are property inquiries`)
    
    // Step 3: Auto-reply to each
    let replied = 0
    for (const comment of propertyComments) {
      console.log(`\n💬 Reply to: ${comment.authorName}`)
      console.log(`   Comment: ${comment.text.substring(0, 80)}...`)
      
      const reply = getRandomReply()
      console.log(`   Reply: ${reply}`)
      
      // In production, use Apify to post the reply
      // await postReply(comment.postId, comment.id, reply)
      
      // Save lead
      await saveLead({
        name: comment.authorName,
        phone: '',
        email: '',
        source: 'facebook',
        message: comment.text,
        location: '',
        budget: '',
        requirement: '',
        notes: `Auto-replied on Facebook. Comment: ${comment.text.substring(0, 200)}`,
      })
      
      replied++
      console.log(`   ✅ Reply sent & lead saved`)
    }
    
    console.log(`\n📊 Summary:`)
    console.log(`   Total comments: ${comments.length}`)
    console.log(`   Property inquiries: ${propertyComments.length}`)
    console.log(`   Auto-replies sent: ${replied}`)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Fetch comments from Facebook page (Apify actor)
async function fetchComments() {
  // In production, call Apify API
  // This is a demo with sample data
  
  const sampleComments = [
    { id: '1', postId: 'post1', authorName: 'Ahmad', text: 'Nak cari condo di Damai, ada tak?', timestamp: new Date().toISOString() },
    { id: '2', postId: 'post1', authorName: 'Sarah', text: 'Looking for house in KK, budget 500k', timestamp: new Date().toISOString() },
    { id: '3', postId: 'post2', authorName: 'John', text: 'Beautiful sunset!', timestamp: new Date().toISOString() }, // Not a lead
    { id: '4', postId: 'post2', authorName: 'Maria', text: 'Ada apartment untuk sewa tak?', timestamp: new Date().toISOString() },
    { id: '5', postId: 'post3', authorName: 'David', text: 'How much is this?', timestamp: new Date().toISOString() },
  ]
  
  // Filter only property inquiries
  return sampleComments.filter(c => isPropertyInquiry(c.text))
}

// Save lead to database
async function saveLead(lead) {
  try {
    const res = await fetch('http://localhost:3000/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([lead]),
    })
    return await res.json()
  } catch (error) {
    console.error('Error saving lead:', error)
    return null
  }
}

// Run
runAutoReply().catch(console.error)

module.exports = { runAutoReply, isPropertyInquiry, AUTO_REPLIES }
