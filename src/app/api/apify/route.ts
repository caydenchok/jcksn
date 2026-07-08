import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { scoreLead, extractLeadFromText } from '@/lib/apify-leads'
import { searchApifyActors, SUGGESTED_ACTORS, buildActorInputs, runActorAndCollect, normalizeActorItem, actorSupportsAutoRegions, actorUsesKeywordSearch, discoverFacebookGroups } from '@/lib/apify-actor'
import { classifyLeadIntent, isClassifierAvailable } from '@/lib/lead-classifier'

const SETTING_KEY = 'apify_settings'

interface ApifySettings {
  apiKey: string
  actorId: string
  actorTitle: string
  dailyBudgetMYR: number
  maxResultsPerUrl: number
  targetUrls: { url: string; label: string; enabled: boolean }[]
  targetKeywords: string[]
  cookies: string
  regions: string[]
  transactionType: 'sale' | 'rent' | 'all'
  isRunning: boolean
  lastRun: string | null
  todaySpent: number
  todayLeads: number
  totalLeads: number
}

const DEFAULT_SETTINGS: ApifySettings = {
  apiKey: process.env.APIFY_TOKEN || '',
  actorId: SUGGESTED_ACTORS[0].id,
  actorTitle: SUGGESTED_ACTORS[0].title,
  dailyBudgetMYR: 30,
  maxResultsPerUrl: 40,
  targetUrls: [],
  targetKeywords: ['looking for', 'nak beli', 'cari rumah', 'budget', 'condo', 'house', 'rent', 'sewa', 'buy', 'beli'],
  cookies: '',
  regions: [],
  transactionType: 'sale',
  isRunning: false,
  lastRun: null,
  todaySpent: 0,
  todayLeads: 0,
  totalLeads: 0,
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

async function loadSettings(): Promise<ApifySettings> {
  const row = await prisma.setting.findUnique({ where: { key: SETTING_KEY } })
  let settings: ApifySettings = DEFAULT_SETTINGS
  if (row) {
    try { settings = { ...DEFAULT_SETTINGS, ...JSON.parse(row.value) } } catch {}
  }
  // Daily counters auto-reset when the calendar day changes.
  if (settings.lastRun && settings.lastRun.slice(0, 10) !== todayStr()) {
    settings.todaySpent = 0
    settings.todayLeads = 0
  }
  return settings
}

async function saveSettings(settings: ApifySettings) {
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    update: { value: JSON.stringify(settings) },
    create: { key: SETTING_KEY, value: JSON.stringify(settings) },
  })
}

async function getApifyBalance(apiKey: string): Promise<{ balance: number | null; plan: string | null; error?: string }> {
  try {
    // /v2/users/me has no remaining-balance field at all (it was never
    // returning real data — this endpoint only has the plan's *tier* and its
    // monthly *limits*, not current usage). The actual "how much is left"
    // figure lives on /v2/users/me/limits as maxMonthlyUsageUsd minus
    // current.monthlyUsageUsd.
    const [meRes, limitsRes] = await Promise.all([
      fetch('https://api.apify.com/v2/users/me', { headers: { Authorization: `Bearer ${apiKey}` } }),
      fetch('https://api.apify.com/v2/users/me/limits', { headers: { Authorization: `Bearer ${apiKey}` } }),
    ])
    if (!meRes.ok) return { balance: null, plan: null, error: `HTTP ${meRes.status}` }
    const me = (await meRes.json()).data
    const plan = me?.plan?.tier ?? null

    if (!limitsRes.ok) return { balance: null, plan, error: `HTTP ${limitsRes.status} (limits)` }
    const limits = (await limitsRes.json()).data
    const max = limits?.limits?.maxMonthlyUsageUsd
    const used = limits?.current?.monthlyUsageUsd
    const balance = typeof max === 'number' && typeof used === 'number' ? Math.max(0, max - used) : null
    return { balance, plan }
  } catch (e: any) {
    return { balance: null, plan: null, error: e.message }
  }
}

export async function GET() {
  const settings = await loadSettings()
  const totalLeads = await prisma.lead.count()

  let apifyBalance: { balance: number | null; plan: string | null; error?: string } = { balance: null, plan: null }
  if (settings.apiKey) {
    apifyBalance = await getApifyBalance(settings.apiKey)
  }

  return NextResponse.json({
    ...settings,
    totalLeads,
    suggestedActors: SUGGESTED_ACTORS,
    apifyBalance: apifyBalance.balance,
    apifyPlan: apifyBalance.plan,
    apifyBalanceError: apifyBalance.error,
  })
}

export async function POST(request: Request) {
  const data = await request.json()
  const settings = await loadSettings()

  if (data.action === 'updateSettings') {
    const editable: (keyof ApifySettings)[] = [
      'apiKey', 'actorId', 'actorTitle', 'dailyBudgetMYR', 'maxResultsPerUrl',
      'targetUrls', 'targetKeywords', 'cookies', 'regions', 'transactionType',
    ]
    for (const key of editable) {
      if (data[key] !== undefined) (settings as any)[key] = data[key]
    }
    await saveSettings(settings)
    return NextResponse.json({ success: true, settings })
  }

  if (data.action === 'searchActors') {
    try {
      const results = await searchApifyActors(String(data.query || ''))
      return NextResponse.json({ results })
    } catch (e: any) {
      return NextResponse.json({ error: e.message || 'Search failed' }, { status: 500 })
    }
  }

  if (data.action === 'discoverGroups') {
    if (!settings.apiKey) {
      return NextResponse.json({ error: 'Please set your Apify API key first' }, { status: 400 })
    }
    if (settings.todaySpent >= settings.dailyBudgetMYR) {
      return NextResponse.json({ error: 'Daily budget reached. Try again tomorrow.' }, { status: 400 })
    }
    try {
      const { groups, costUsd } = await discoverFacebookGroups(String(data.query || ''), settings.apiKey)
      settings.todaySpent += costUsd * 4.5
      settings.lastRun = new Date().toISOString()
      await saveSettings(settings)
      return NextResponse.json({ groups, spent: settings.todaySpent })
    } catch (e: any) {
      return NextResponse.json({ error: e.message || 'Group discovery failed' }, { status: 500 })
    }
  }

  if (data.action === 'startScraping') {
    if (settings.isRunning) {
      return NextResponse.json({ error: 'Scraping already in progress' }, { status: 400 })
    }
    if (!settings.apiKey) {
      return NextResponse.json({ error: 'Please set your Apify API key first' }, { status: 400 })
    }
    if (!settings.actorId) {
      return NextResponse.json({ error: 'Please choose an actor to run first' }, { status: 400 })
    }
    const enabledUrls = settings.targetUrls.filter(u => u.enabled).map(u => u.url)
    const usingKeywordSearch = actorUsesKeywordSearch(settings.actorId) && settings.regions.length > 0
    if (enabledUrls.length === 0 && !usingKeywordSearch) {
      return NextResponse.json({ error: 'Add at least one target URL (Facebook Group, Page, or Marketplace search), or a region/keyword to auto-discover from' }, { status: 400 })
    }
    if (settings.todaySpent >= settings.dailyBudgetMYR) {
      return NextResponse.json({ error: 'Daily budget reached. Try again tomorrow.' }, { status: 400 })
    }

    settings.isRunning = true
    await saveSettings(settings)

    try {
      // One input per required actor run — the Facebook posts-search actor
      // only takes a single query, so each configured phrase becomes its own
      // run (other actors return a single input covering everything).
      const inputs = await buildActorInputs(
        settings.actorId,
        enabledUrls,
        {
          maxResultsPerUrl: settings.maxResultsPerUrl,
          includeComments: true,
          cookies: settings.cookies,
          regions: settings.regions,
          transactionType: settings.transactionType,
        },
        settings.apiKey,
      )

      const items: any[] = []
      let costUsd = 0
      for (const input of inputs) {
        // Re-check the budget between runs so a multi-phrase batch stops
        // early instead of overshooting the daily cap.
        if (settings.todaySpent + costUsd * 4.5 >= settings.dailyBudgetMYR) break
        const run = await runActorAndCollect(settings.actorId, input, settings.apiKey)
        items.push(...run.items)
        costUsd += run.costUsd
      }

      // Label leads by what was actually scraped, not always "facebook".
      const actorIdLower = settings.actorId.toLowerCase()
      const leadSource = actorIdLower.includes('mudah') ? 'mudah'
        : actorIdLower.includes('tiktok') ? 'tiktok'
        : (actorIdLower.includes('xiaohongshu') || actorIdLower.includes('rednote')) ? 'xiaohongshu'
        : actorIdLower.includes('instagram') ? 'instagram'
        : actorIdLower.includes('facebook') ? 'facebook'
        : 'apify'

      // AI ad/buyer filter: checked once per run (not per item) so a down
      // Ollama fails fast instead of stalling on every item's own timeout.
      // Free, local, separate from the WhatsApp bot's DeepSeek/Ollama setup.
      const aiFilterAvailable = await isClassifierAvailable()
      let aiRejected = 0

      // A buyer post from months ago is dead intent — they've almost
      // certainly found a place already. Skip anything older than this;
      // posts with no readable date are kept (fail open).
      // A buyer post from ~2 weeks ago has almost certainly found a place
      // already — skip anything older than this to save classifier time and
      // database space on dead leads.
      const MAX_POST_AGE_DAYS = 14
      const staleCutoff = Date.now() - MAX_POST_AGE_DAYS * 24 * 60 * 60 * 1000
      let staleSkipped = 0
      let lowQualityRejected = 0

      // Shared by both the main post/note text AND each nested comment —
      // comments are where buyer/renter intent often actually shows up
      // (e.g. someone replying "how much is rent?" under a property post).
      async function tryImportLead(text: string, author: string, url: string, profileUrl: string, postedAt: Date | null): Promise<boolean> {
        if (!text) return false
        if (postedAt && postedAt.getTime() < staleCutoff) {
          staleSkipped++
          return false
        }
        const extracted = extractLeadFromText(text, leadSource)
        const hasCustomKeyword = settings.targetKeywords.some(kw => text.toLowerCase().includes(kw.toLowerCase()))
        const lead = {
          name: author,
          phone: extracted.phone,
          email: extracted.email,
          message: extracted.message,
          location: extracted.location,
          budget: extracted.budget,
          requirement: extracted.requirement,
        }

        // Gate on content signal alone (no recency) — otherwise a fresh but
        // contentless comment (e.g. "Thank you admin 🙏" with just a name
        // attached) scores 30 on freshness alone and passes with zero actual
        // buyer intent. That gap matters most exactly when Ollama is down
        // and can't catch it downstream — the same failure mode that let 59
        // bad leads through earlier. Recency still boosts the DISPLAYED/
        // sorted score so fresher genuine leads rank higher, it just can't
        // be the reason a lead qualifies in the first place.
        const baseScore = scoreLead(lead, null)
        const score = scoreLead(lead, postedAt)
        // A phone/email in the post text is one contact path, but social
        // posts/comments rarely include one — the profile URL (DM them
        // directly) is just as real a way to reach a genuine buyer, and
        // requiring phone/email alone was silently dropping exactly the
        // kind of plain, no-contact-info buyer asks this app is meant to find.
        const hasContact = !!(lead.phone || lead.email || profileUrl)
        if (!hasContact || (baseScore < 30 && !hasCustomKeyword)) return false

        // Keyword scoring can't tell "I'm selling" from "I'm buying" — an ad
        // and a genuine buyer's comment both mention price/location/type.
        // Ask the AI classifier to reject confirmed ads. Fails open: if
        // Ollama is down or says "unclear", the keyword-passed lead is kept
        // rather than lost.
        let intent: 'buyer' | 'seller' | 'unclear' | null = null
        if (aiFilterAvailable) {
          intent = await classifyLeadIntent(text)
          if (intent === 'seller') {
            aiRejected++
            return false
          }
          // "Unclear" + weak keyword signal = noise (this exact combination
          // let a scam-warning rant through). A confirmed "buyer" verdict or
          // a strong keyword score can each stand alone; unclear needs the
          // score to back it up. Uses baseScore for the same reason as the
          // gate above — recency shouldn't be what backs up an "unclear"
          // verdict either. Classifier errors (null) stay fail-open.
          if (intent === 'unclear' && baseScore < 50) {
            lowQualityRejected++
            return false
          }
        }

        // Skip leads we've already captured: same phone, same PERSON (profile
        // URL — the same renter re-posting an edited ask across days/groups
        // is one contact, not two leads), or same post text.
        const dup = await prisma.lead.findFirst({
          where: {
            OR: [
              ...(lead.phone ? [{ phone: lead.phone }] : []),
              ...(profileUrl ? [{ profileUrl }] : []),
              ...(lead.message ? [{ message: lead.message }] : []),
            ],
          },
        })
        if (dup) return false

        // A name lifted straight from the person's platform profile IS their
        // identity — mark it verified. Facebook anonymous group posts carry
        // "Anonymous participant" or an auto-pseudonym like
        // "PassionateHamster6850" (CamelCase + digits): not a real identity,
        // so those stay unverified until they e.g. message us on WhatsApp.
        const isAnonymousName = !author.trim()
          || /^anonymous/i.test(author.trim())
          || /^(unknown|user)$/i.test(author.trim())
          || /^[A-Z][a-z]+[A-Z][a-z]+\d+$/.test(author.trim())

        await prisma.lead.create({
          data: {
            name: lead.name,
            phone: lead.phone,
            email: lead.email,
            source: leadSource,
            message: lead.message,
            location: lead.location,
            budget: lead.budget,
            requirement: lead.requirement,
            profileUrl: profileUrl || url,
            postedAt,
            nameVerified: !isAnonymousName,
            notes: `Auto-imported via ${settings.actorTitle}. Score: ${score}/100${intent ? ` · AI: ${intent}` : ''}`,
          },
        })
        return true
      }

      let imported = 0
      for (const raw of items) {
        const norm = normalizeActorItem(raw)
        if (await tryImportLead(norm.text, norm.author, norm.url, norm.profileUrl, norm.postedAt)) imported++
        for (const c of norm.rawComments) {
          // Prefer the comment's own timestamp (a fresh comment on an old
          // post is live intent); fall back to the parent post's date.
          if (await tryImportLead(c.text, c.author, norm.url, c.profileUrl, c.postedAt ?? norm.postedAt)) imported++
        }
      }

      const spentMYR = costUsd * 4.5
      settings.isRunning = false
      settings.lastRun = new Date().toISOString()
      settings.todayLeads += imported
      settings.todaySpent += spentMYR
      await saveSettings(settings)

      return NextResponse.json({
        success: true,
        imported,
        scanned: items.length,
        aiRejected,
        staleSkipped,
        lowQualityRejected,
        aiFilterAvailable,
        spent: settings.todaySpent,
        budget: settings.dailyBudgetMYR,
      })
    } catch (e: any) {
      settings.isRunning = false
      await saveSettings(settings)
      return NextResponse.json({ error: e.message || 'Scraping failed' }, { status: 500 })
    }
  }

  if (data.action === 'resetDaily') {
    settings.todaySpent = 0
    settings.todayLeads = 0
    await saveSettings(settings)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
