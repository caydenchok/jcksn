// Lead Qualification Flow
// Captures and qualifies leads before they talk to the main AI

import { prisma } from './db'

export interface QualificationState {
  phone: string
  step: number
  name: string
  budget: string
  location: string
  propertyType: string
  timeline: string
  isQualified: boolean
  score: number
}

export const QUALIFICATION_STEPS = [
  { key: 'name', question: 'Hi! 👋 Welcome to ZERO88 Property. I\'m Jackson Liew\'s assistant.\n\nFirst, what\'s your name?' },
  { key: 'budget', question: 'Nice to meet you, {name}! 😊\n\nWhat\'s your budget range?\n\n1️⃣ Under RM 300k\n2️⃣ RM 300k - 500k\n3️⃣ RM 500k - 800k\n4️⃣ RM 800k - 1.5M\n5️⃣ Above RM 1.5M\n6️⃣ Not sure yet' },
  { key: 'location', question: 'Got it! Which area are you looking at?\n\n1️⃣ City Center (Likas, Luyang, Damai)\n2️⃣ Penampang / Menggatal\n3️⃣ Inanam / Sepanggar\n4️⃣ Tuaran / Outskirts\n5️⃣ Anywhere in KK\n6️⃣ Other (please type)' },
  { key: 'propertyType', question: 'What type of property are you looking for?\n\n1️⃣ Condo / Apartment\n2️⃣ House / Terrace\n3️⃣ Semi-D / Bungalow\n4️⃣ Any type\n5️⃣ Not sure yet' },
  { key: 'timeline', question: 'Last one! When are you looking to move?\n\n1️⃣ ASAP (within 1 month)\n2️⃣ Within 3 months\n3️⃣ Within 6 months\n4️⃣ Just exploring' },
]

const BUDGET_MAP: Record<string, string> = {
  '1': 'Under RM 300k',
  '2': 'RM 300k - 500k',
  '3': 'RM 500k - 800k',
  '4': 'RM 800k - 1.5M',
  '5': 'Above RM 1.5M',
  '6': 'Not sure',
}

const LOCATION_MAP: Record<string, string> = {
  '1': 'City Center',
  '2': 'Penampang / Menggatal',
  '3': 'Inanam / Sepanggar',
  '4': 'Tuaran / Outskirts',
  '5': 'Anywhere in KK',
}

const PROPERTY_TYPE_MAP: Record<string, string> = {
  '1': 'Condo / Apartment',
  '2': 'House / Terrace',
  '3': 'Semi-D / Bungalow',
  '4': 'Any type',
  '5': 'Not sure',
}

const TIMELINE_MAP: Record<string, string> = {
  '1': 'ASAP',
  '2': 'Within 3 months',
  '3': 'Within 6 months',
  '4': 'Just exploring',
}

// Track qualification states in memory (in production, use Redis)
const qualificationStates: Map<string, QualificationState> = new Map()

export function getQualificationState(phone: string): QualificationState | null {
  return qualificationStates.get(phone) || null
}

export function startQualification(phone: string): QualificationState {
  const state: QualificationState = {
    phone,
    step: 0,
    name: '',
    budget: '',
    location: '',
    propertyType: '',
    timeline: '',
    isQualified: false,
    score: 0,
  }
  qualificationStates.set(phone, state)
  return state
}

export function processQualificationStep(phone: string, answer: string): {
  response: string
  isComplete: boolean
  leadData?: any
} {
  const state = qualificationStates.get(phone)
  if (!state) {
    return { response: '', isComplete: true }
  }

  const step = QUALIFICATION_STEPS[state.step]
  if (!step) {
    return { response: '', isComplete: true }
  }

  // Process the answer based on step
  switch (step.key) {
    case 'name':
      state.name = answer.trim()
      break
    case 'budget':
      state.budget = BUDGET_MAP[answer.trim()] || answer.trim()
      break
    case 'location':
      state.location = LOCATION_MAP[answer.trim()] || answer.trim()
      break
    case 'propertyType':
      state.propertyType = PROPERTY_TYPE_MAP[answer.trim()] || answer.trim()
      break
    case 'timeline':
      state.timeline = TIMELINE_MAP[answer.trim()] || answer.trim()
      break
  }

  // Move to next step
  state.step++

  // Check if qualification is complete
  if (state.step >= QUALIFICATION_STEPS.length) {
    state.isQualified = true
    state.score = calculateScore(state)

    // Save lead to database
    const leadData = saveQualifiedLead(state)

    // Clean up
    qualificationStates.delete(phone)

    const qualificationSummary = [
      `✅ *Thank you, ${state.name}!*`,
      ``,
      `Here's what I got:`,
      `💰 Budget: ${state.budget}`,
      `📍 Location: ${state.location}`,
      `🏠 Type: ${state.propertyType}`,
      `⏰ Timeline: ${state.timeline}`,
      ``,
      state.score >= 70
        ? `Great news! Jackson will personally assist you. He'll contact you shortly! 📱`
        : `Thanks for the info! Jackson will review and get back to you soon.`,
      ``,
      `Meanwhile, type /property to see available listings!`,
    ].join('\n')

    return { response: qualificationSummary, isComplete: true, leadData }
  }

  // Get next question
  const nextStep = QUALIFICATION_STEPS[state.step]
  let question = nextStep.question
  if (state.name) {
    question = question.replace('{name}', state.name)
  }

  return { response: question, isComplete: false }
}

function calculateScore(state: QualificationState): number {
  let score = 0

  // Has name
  if (state.name && state.name.length > 1) score += 20

  // Has budget (knows what they want)
  if (state.budget && state.budget !== 'Not sure') score += 25

  // Has specific location preference
  if (state.location && state.location !== 'Anywhere in KK') score += 20

  // Has property type preference
  if (state.propertyType && state.propertyType !== 'Any type' && state.propertyType !== 'Not sure') score += 15

  // Timeline urgency
  if (state.timeline === 'ASAP') score += 20
  else if (state.timeline === 'Within 3 months') score += 15
  else if (state.timeline === 'Within 6 months') score += 10

  return Math.min(score, 100)
}

async function saveQualifiedLead(state: QualificationState) {
  try {
    const lead = await prisma.lead.create({
      data: {
        name: state.name,
        phone: state.phone,
        source: 'whatsapp',
        message: `Qualified lead: ${state.propertyType} in ${state.location}, budget ${state.budget}, timeline ${state.timeline}`,
        location: state.location,
        budget: state.budget,
        requirement: state.propertyType,
        status: 'qualified',
        notes: `Auto-qualified. Score: ${state.score}/100. Timeline: ${state.timeline}`,
      },
    })
    return lead
  } catch (error) {
    console.error('Error saving lead:', error)
    return null
  }
}

export function isQualifying(phone: string): boolean {
  return qualificationStates.has(phone)
}

export function shouldStartQualification(phone: string, messageCount: number): boolean {
  // Start qualification for first-time contacts or very early messages
  return messageCount <= 2
}
