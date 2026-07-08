// Classifies a scraped post/comment as a genuine buyer/renter vs. a seller/
// agent ad — the thing keyword scoring alone can't tell apart (an ad and a
// buyer's comment both mention price, location, and property type).
//
// This is a completely separate Ollama client from src/lib/ai.ts's
// WhatsApp-reply client. It never imports from or modifies ai.ts, so the
// WhatsApp bot's DeepSeek-primary/Ollama-fallback logic is untouched by this
// file. The only shared resource is the local Ollama process itself — if
// DeepSeek is down and WhatsApp is relying on Ollama, a large lead-scraping
// batch could momentarily queue behind/after a WhatsApp reply on that same
// local server. Once DeepSeek has balance again, WhatsApp won't touch Ollama
// at all, and there's no contention.
import OpenAI from 'openai'

const classifierOllama = new OpenAI({
  apiKey: 'ollama',
  baseURL: 'http://localhost:11434/v1',
})
const CLASSIFIER_MODEL = process.env.OLLAMA_MODEL || 'llama3.2'

export type LeadIntent = 'buyer' | 'seller' | 'unclear'

export async function isClassifierAvailable(): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

// Returns null (not 'unclear') when Ollama itself is unreachable/errors, so
// callers can fail open — keep the lead rather than lose it just because the
// classifier hiccuped.
export async function classifyLeadIntent(text: string): Promise<LeadIntent | null> {
  // Deterministic pre-checks first — more reliable than asking a small local
  // model, and both verified live against real scraped content:
  //
  // 1. A REN/PEA license number or agency name is unambiguous proof of a
  //    licensed agent (caught a rhetorical "Looking for a condo?" hook that
  //    the model alone missed, even with a matching REN number present).
  if (/\bREN\s*\d{3,}/i.test(text) || /\bPEA\s*\d{3,}/i.test(text) || /realty|properties sdn bhd|real estate sdn bhd/i.test(text)) {
    return 'seller'
  }
  // 2. Genuine casual asks (e.g. "Cari rumah sewa di Penampang") never carry
  //    hashtag-spam — that's a content-marketing tactic. Caught a homestay/
  //    Airbnb ad using the same rhetorical-hook pattern that both the REN
  //    check and the model alone missed (no REN number, since it's not a
  //    licensed real estate agent — just a business using the same hook).
  const hashtagCount = (text.match(/#\w+/g) || []).length
  if (hashtagCount >= 3) return 'seller'

  // 3. "Berminat? [contact me]" (interested? whatsapp/call/hubungi/pm me) is
  // a standard Malaysian marketplace solicitation phrase — nobody genuinely
  // searching for a home invites others to contact THEM about it; only
  // whoever is offering something phrases it that way. Caught a real case
  // ("Senarai rumah untuk disewa... Berminat? bole wasap") with no REN
  // number and no hashtags, that both earlier checks and the model missed.
  if (/berminat.{0,25}(wasap|whatsapp|hubungi|call|pm\b|dm\b)/i.test(text)) return 'seller'
  // "Senarai" (a list) of properties is itself a supply-side signal — a
  // genuine buyer wants ONE home for themselves, never offers "a list".
  if (/senarai\s+(rumah|hartanah|unit|property|properti)/i.test(text)) return 'seller'

  // 4. The general classified-ad shape: a property-status LABEL ("for
  // rent"/"disewa" as a tag on a specific unit, not "cari rumah sewa" which
  // is a search) + a phone number + a contact-me solicitation, all three
  // together. This generalizes past exact phrasing the model failed to
  // (verified: it missed a near-identical rephrasing of an ad it had even
  // seen as a few-shot example — small models don't generalize reliably
  // from a single example, so the structural pattern is checked directly).
  const hasListingLabel = /\b(for\s*rent|for\s*sale|disewa|dijual)\b/i.test(text)
  const hasPhoneNumber = /(?:\+?6?0?1[0-9][-\s]?\d{3,4}[-\s]?\d{4})/.test(text)
  // "wspp"/"wsap"/"wsp"/"watsapp" are the common Malaysian shorthand for
  // WhatsApp in ad copy (verified: missed a real landlord ad — "For more
  // detail: wspp 0143186926" — because only the full word was recognized).
  const hasContactCTA = /\b(dm|whatsapp|wasap|wspp|wsap|wsp|watsapp|hubungi|contact\s*me|call\s*me)\b/i.test(text)
  if (hasListingLabel && hasPhoneNumber && hasContactCTA) return 'seller'

  // 5. Spec-sheet shape: 3+ concrete unit specs (bedroom/bathroom/sqft/
  // parking/floor/furnished) listed together is how an agent describes ONE
  // specific unit for rent/sale — a genuine buyer states what they want in
  // a line or two, never itemizes a full spec sheet for a unit they don't
  // have. Catches rhetorical-hook ads with no explicit "for rent/sale" tag
  // (e.g. "Looking for a spacious condo?" followed by a 4-bed/3-bath/
  // 1,500sqft/2-car-park listing) that check 4 above misses.
  const specSignals = [
    /\d+\s*(?:bed(?:room)?s?|br\b|bilik)/i,
    /\d+\s*(?:bath(?:room)?s?|tandas)/i,
    /\d+[,.]?\d*\s*(?:sq\.?\s?ft|sqft|sf\b)/i,
    /\d+\s*(?:car\s*park|parking)/i,
    /\b(?:level|floor|tingkat|lantai)\s*\d+/i,
    /\bfurnished\b/i,
    /\bbalcony|balkoni\b/i,
  ]
  const specCount = specSignals.filter(re => re.test(text)).length
  if (specCount >= 3 && hasPhoneNumber) return 'seller'

  try {
    const completion = await classifierOllama.chat.completions.create(
      {
        model: CLASSIFIER_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You classify short property-related social media posts or comments from Malaysia as BUYER, SELLER, or UNCLEAR. Reply with exactly one word.\n\n' +
              'SELLER = advertising a specific property: lists specs (sqft/bedrooms/floor/parking), a price/booking fee, or "DM/WhatsApp/call for viewing/details/booking". A rhetorical hook like "Looking for a comfy place?" followed by specs+booking info is STILL SELLER, regardless of the words "looking for".\n' +
              'BUYER = a short, casual, first-person REQUEST for a property, with little/no marketing structure — genuine buyers write brief, plain asks, not polished ad copy.\n\n' +
              'Examples:\n' +
              'BUYER: "Cari rumah sewa di Penampang"\n' +
              'BUYER: "Looking for a 2BR condo in Kota Kinabalu, budget RM1800, call me 0123456789"\n' +
              'SELLER: "Rooms for Rent @ Damai, KK. Fully furnished. DM or WhatsApp Jeff"\n\n' +
              'Reply with only one word: BUYER, SELLER, or UNCLEAR.',
          },
          { role: 'user', content: text.slice(0, 800) },
        ],
        max_tokens: 5,
        temperature: 0,
      },
      { timeout: 10000 },
    )
    const answer = completion.choices[0]?.message?.content?.trim().toUpperCase() || ''
    if (answer.startsWith('BUYER')) return 'buyer'
    if (answer.startsWith('SELLER')) return 'seller'
    return 'unclear'
  } catch {
    return null
  }
}
