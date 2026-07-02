import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { scoreLead } from '@/lib/apify-leads'

interface ApifySettings {
  apiKey: string
  dailyBudgetMYR: number
  targetGroups: { url: string; name: string; enabled: boolean }[]
  targetKeywords: string[]
  isRunning: boolean
  lastRun: string | null
  todaySpent: number
  todayLeads: number
  totalLeads: number
}

let apifySettings: ApifySettings = {
  apiKey: process.env.APIFY_TOKEN || '',
  dailyBudgetMYR: 30,
  targetGroups: [
    { url: 'https://facebook.com/groups/sabahpropertyforsale', name: 'Sabah Property For Sale', enabled: true },
    { url: 'https://facebook.com/groups/sabahproperty', name: 'Sabah Property', enabled: true },
    { url: 'https://facebook.com/groups/kotakinabaluproperty', name: 'KK Property', enabled: true },
    { url: 'https://facebook.com/groups/sabahrental', name: 'Sabah Rental', enabled: true },
  ],
  targetKeywords: ['looking for', 'nak beli', 'cari rumah', 'budget', 'condo', 'house', 'rent', 'sewa', 'buy', 'beli'],
  isRunning: false,
  lastRun: null,
  todaySpent: 0,
  todayLeads: 0,
  totalLeads: 0,
}

async function getApifyBalance(apiKey: string): Promise<{ balance: number | null; plan: string | null; error?: string }> {
  try {
    const res = await fetch('https://api.apify.com/v2/users/me', {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) return { balance: null, plan: null, error: `HTTP ${res.status}` }
    const data = await res.json()
    const user = data.data
    const balance = user?.plan?.remainingUsd ?? user?.balance ?? null
    const plan = user?.plan?.name ?? null
    return { balance, plan }
  } catch (e: any) {
    return { balance: null, plan: null, error: e.message }
  }
}

export async function GET() {
  const totalLeads = await prisma.lead.count()

  let apifyBalance: { balance: number | null; plan: string | null; error?: string } = { balance: null, plan: null }
  if (apifySettings.apiKey && apifySettings.apiKey !== 'YOUR_APIFY_TOKEN_HERE') {
    apifyBalance = await getApifyBalance(apifySettings.apiKey)
  }

  return NextResponse.json({
    ...apifySettings,
    totalLeads,
    apifyBalance: apifyBalance.balance,
    apifyPlan: apifyBalance.plan,
    apifyBalanceError: apifyBalance.error,
  })
}

export async function POST(request: Request) {
  const data = await request.json()

  if (data.action === 'updateSettings') {
    if (data.apiKey !== undefined) apifySettings.apiKey = data.apiKey
    if (data.dailyBudgetMYR !== undefined) apifySettings.dailyBudgetMYR = data.dailyBudgetMYR
    if (data.targetGroups !== undefined) apifySettings.targetGroups = data.targetGroups
    if (data.targetKeywords !== undefined) apifySettings.targetKeywords = data.targetKeywords
    return NextResponse.json({ success: true, settings: apifySettings })
  }

  if (data.action === 'startScraping') {
    if (apifySettings.isRunning) {
      return NextResponse.json({ error: 'Scraping already in progress' }, { status: 400 })
    }

    if (!apifySettings.apiKey || apifySettings.apiKey === 'YOUR_APIFY_TOKEN_HERE') {
      return NextResponse.json({ error: 'Please set your Apify API key first' }, { status: 400 })
    }

    if (apifySettings.todaySpent >= apifySettings.dailyBudgetMYR) {
      return NextResponse.json({ error: 'Daily budget reached. Try again tomorrow.' }, { status: 400 })
    }

    apifySettings.isRunning = true

    // In production, call Apify API here
    // Demo: create sample leads
    const sampleLeads = [
      { name: 'Ahmad bin Hassan', phone: '0123456789', email: 'ahmad@gmail.com', source: 'facebook', message: 'Nak cari condo di Damai, budget 500k', location: 'Damai', budget: '500k', requirement: 'Condo' },
      { name: 'Sarah Lim', phone: '0198765432', source: 'facebook', message: 'Looking for house in Likas, 3 bedroom', location: 'Likas', requirement: 'House, 3 BR' },
      { name: 'David Wong', phone: '0178901234', email: 'david@outlook.com', source: 'instagram', message: 'Cari rumah sewa di Penampang', location: 'Penampang', requirement: 'For Rent, House' },
    ]

    let imported = 0
    for (const lead of sampleLeads) {
      const score = scoreLead(lead)
      if (score >= 30) {
        await prisma.lead.create({
          data: {
            name: lead.name,
            phone: lead.phone || '',
            email: lead.email || '',
            source: lead.source,
            message: lead.message,
            location: lead.location,
            budget: lead.budget || '',
            requirement: lead.requirement,
            notes: `Auto-imported from ${lead.source}. Score: ${score}/100`,
          },
        })
        imported++
      }
    }

    apifySettings.isRunning = false
    apifySettings.lastRun = new Date().toISOString()
    apifySettings.todayLeads += imported
    apifySettings.todaySpent += 0.15

    return NextResponse.json({
      success: true,
      imported,
      spent: apifySettings.todaySpent,
      budget: apifySettings.dailyBudgetMYR,
    })
  }

  if (data.action === 'resetDaily') {
    apifySettings.todaySpent = 0
    apifySettings.todayLeads = 0
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
