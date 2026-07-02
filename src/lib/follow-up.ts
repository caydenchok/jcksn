import { prisma } from './db'

const FOLLOW_UP_MESSAGES = [
  "Hi! Just checking in — is there anything I can help you with regarding properties in Sabah? 😊",
  "Hey there! Haven't heard from you in a while. Still looking for a property? I have some new listings!",
  "Hi! Hope you're doing well. Let me know if you need any help with your property search 🏠",
]

const HANDOFF_MESSAGES = [
  "Hi! Jackson here 👋 I saw you wanted to speak with me. How can I help you today?",
  "Hey! This is Jackson. I'm here to help you personally with your property needs. What can I do for you?",
  "Hi! Thanks for reaching out. I'm Jackson, your property agent. How can I assist you today?",
]

export async function getHandoffConversations() {
  try {
    const results = await prisma.$queryRaw`
      SELECT * FROM Conversation WHERE needsHandoff = 1 ORDER BY lastActive DESC LIMIT 50
    `
    return results as any[]
  } catch (e) {
    console.error('[FollowUp] getHandoffConversations error:', e)
    return []
  }
}

export async function getInactiveConversations(days: number = 2) {
  try {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const results = await prisma.$queryRaw`
      SELECT * FROM Conversation
      WHERE lastActive < ${cutoff}
        AND needsHandoff = 0
        AND followUpCount < 3
        AND phone != ''
      ORDER BY lastActive ASC
      LIMIT 50
    `
    return results as any[]
  } catch (e) {
    console.error('[FollowUp] getInactiveConversations error:', e)
    return []
  }
}

export async function markHandoffComplete(phone: string) {
  return prisma.$executeRaw`UPDATE Conversation SET needsHandoff = 0, handoffNote = NULL WHERE phone = ${phone}`
}

export async function recordFollowUp(phone: string, message: string) {
  return prisma.$executeRaw`UPDATE Conversation SET lastFollowUp = ${new Date()}, followUpCount = followUpCount + 1 WHERE phone = ${phone}`
}

export function getFollowUpMessage(attempt: number): string {
  return FOLLOW_UP_MESSAGES[Math.min(attempt, FOLLOW_UP_MESSAGES.length - 1)]
}

export function getHandoffMessage(): string {
  return HANDOFF_MESSAGES[Math.floor(Math.random() * HANDOFF_MESSAGES.length)]
}
