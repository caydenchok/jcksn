/**
 * Quick Lead Import Tool
 * 
 * Import leads from CSV or JSON into your system.
 * 
 * Usage:
 *   node scripts/import-leads.js leads.csv
 *   node scripts/import-leads.js leads.json
 * 
 * CSV format: name,phone,email,source,location,budget,requirement,message
 */

const fs = require('fs')
const path = require('path')

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000'

async function importLeads(filePath) {
  console.log(`📥 Importing leads from ${filePath}...\n`)
  
  const ext = path.extname(filePath).toLowerCase()
  let leads = []
  
  if (ext === '.csv') {
    leads = parseCSV(fs.readFileSync(filePath, 'utf-8'))
  } else if (ext === '.json') {
    leads = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } else {
    console.error('❌ Unsupported file format. Use .csv or .json')
    return
  }
  
  console.log(`📋 Found ${leads.length} leads`)
  
  // Validate and clean
  const validLeads = leads.filter(lead => {
    if (!lead.phone && !lead.email && !lead.name) {
      console.log(`   ⚠️ Skipping lead with no contact info: ${lead.name || 'unknown'}`)
      return false
    }
    return true
  }).map(lead => ({
    name: lead.name || '',
    phone: lead.phone || '',
    email: lead.email || '',
    source: lead.source || 'import',
    message: lead.message || '',
    location: lead.location || 'Kota Kinabalu',
    budget: lead.budget || '',
    requirement: lead.requirement || '',
  }))
  
  console.log(`✅ ${validLeads.length} valid leads to import\n`)
  
  // Show preview
  console.log('Preview:')
  validLeads.slice(0, 5).forEach((lead, i) => {
    console.log(`  ${i + 1}. ${lead.name || 'No name'} | ${lead.phone || lead.email} | ${lead.source} | ${lead.requirement || lead.message.substring(0, 50)}`)
  })
  if (validLeads.length > 5) {
    console.log(`  ... and ${validLeads.length - 5} more`)
  }
  
  // Import
  console.log('\n📤 Importing...')
  try {
    const res = await fetch(`${BACKEND_URL}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validLeads),
    })
    
    const result = await res.json()
    console.log(`\n✅ Successfully imported ${result.imported} leads`)
    console.log(`💡 View at: ${BACKEND_URL}/leads`)
  } catch (err) {
    console.error('❌ Import failed:', err.message)
    console.log('💡 Make sure the server is running: npm run dev')
  }
}

function parseCSV(csv) {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  return lines.slice(1).map(line => {
    const values = line.split(',')
    const lead = {}
    headers.forEach((header, i) => {
      lead[header] = values[i]?.trim() || ''
    })
    return lead
  })
}

// CLI
const args = process.argv.slice(2)
if (args.length === 0) {
  console.log(`
📥 Lead Import Tool

Usage:
  node scripts/import-leads.js <file.csv>
  node scripts/import-leads.js <file.json>

CSV format:
  name,phone,email,source,location,budget,requirement,message
  John,0123456789,john@email.com,facebook,Damai,500k,condo,Looking for condo in Damai
  Sarah,0198765432,,instagram,Likas,,house,Interested in house for rent

Sources: facebook, instagram, tiktok, google, whatsapp, manual, website, propertyguru
`)
} else {
  importLeads(args[0])
}

module.exports = { importLeads }
