// Apify actor discovery + generic run/scrape execution.
// Lets the user pick ANY Apify actor (not a hardcoded one) and adapts our
// input to whatever fields that actor's own input schema declares, instead
// of assuming a fixed shape that only happens to match one specific actor.

const APIFY_API = 'https://api.apify.com/v2'

// Facebook Marketplace URLs follow a predictable, verified pattern:
// facebook.com/marketplace/<city-slug>/<category>. Lets us go straight from
// a typed location ("Kota Kinabalu") to a real target URL with no actor
// search needed. The two category slugs below were hand-verified live
// (facebook.com/marketplace/kotakinabalu/propertyforsale and .../propertyrentals
// both resolve to real category pages).
export function slugifyMarketplaceLocation(location: string): string {
  return location.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function buildMarketplaceUrls(location: string): { forSale: string; forRent: string } {
  const slug = slugifyMarketplaceLocation(location)
  return {
    forSale: `https://www.facebook.com/marketplace/${slug}/propertyforsale`,
    forRent: `https://www.facebook.com/marketplace/${slug}/propertyrentals`,
  }
}

export interface ActorSearchResult {
  id: string // "username/actor-name"
  title: string
  description: string
  totalRuns: number
  target?: 'demand' | 'supply' | 'mixed' // demand = buyers/renters looking, supply = agents/owners listing
}

// Actors we've hand-verified work correctly — offered as one-click presets,
// but the user can search/pick any other actor.
//
// Important distinction: some actors scrape PROPERTY LISTINGS (supply side —
// sellers/agents/landlords advertising a unit). Others scrape POSTS from
// groups/pages, which is where actual buyers/renters write "looking for a
// 2BR in Damai, budget 400k" (demand side). Only the latter produces the
// kind of lead this app's keyword/intent scoring was built to find.
// Each pick below was chosen by comparing real Apify Store data — review
// rating, review count (a 5.0 from 2 reviews is noise; a 4.8 from 70 isn't),
// and 30-day success rate — not just total run count. Re-verify periodically;
// actor quality on Apify drifts as maintainers change.
export const SUGGESTED_ACTORS: ActorSearchResult[] = [
  // ── DEMAND-SIDE: people LOOKING to buy/rent (your actual target) ──
  {
    id: 'scraper_one/facebook-posts-search',
    title: 'Facebook Post Search — finds buyers & renters',
    description: 'Search ALL public Facebook posts by REQUEST phrase — "looking for a place to rent in Kota Kinabalu". Topic words surface agents, so always use a request phrase. 740k runs, 4.67★.',
    totalRuns: 0,
    target: 'demand',
  },
  {
    id: 'clockworks/tiktok-scraper',
    title: 'TikTok Scraper — finds buyers & renters',
    description: 'Type keywords like "cari rumah sarawak" or "kuala lumpur rental" — searches videos + captions + comments. 94.5M runs, 4.76★/324 reviews.',
    totalRuns: 0,
    target: 'demand',
  },
  {
    id: 'habit.zhou/xiaohongshu-pro-scraper',
    title: 'Xiaohongshu / RedNote — finds buyers & renters',
    description: 'Type keywords (e.g. "沙巴买房", "古晋租房") — searches notes + comments. Mandarin-dominant platform, strong for Chinese-speaking leads. 5★, 100% success/30d.',
    totalRuns: 0,
    target: 'demand',
  },

  // ── DEMAND + SUPPLY mixed (AI classifier filters agents out) ──
  {
    id: 'apify/facebook-groups-scraper',
    title: 'Facebook Group Scraper — buyers, renters & agents',
    description: 'Scrapes public group posts + comments. Has both genuine "cari rumah" posts AND agent listings — AI classifier filters the ads. 4.2M runs, 4.8★/70 reviews.',
    totalRuns: 0,
    target: 'demand',
  },
  {
    id: 'whoareyouanas/facebook-group-scraper',
    title: 'Facebook Group Scraper — private groups, buyers & renters too',
    description: 'Same as above for closed/private groups. Needs login cookies. Has both buyer posts and agent listings.',
    totalRuns: 0,
    target: 'demand',
  },
  {
    id: 'mai_amm/malaysia-property-leads-scraper',
    title: 'Mudah.my — property listings + wanted posts',
    description: 'Scrapes Mudah.my by region (Sabah, Sarawak, KL...). Has both agent listings AND genuine "cari sewa" / wanted posts — AI classifier keeps only the buyers & renters.',
    totalRuns: 0,
    target: 'demand',
  },
  {
    id: 'apify/instagram-comment-scraper',
    title: 'Instagram Comments — buyers asking under listing posts',
    description: 'Unlike Facebook/TikTok, Instagram has no caption/text search — paste specific listing post/reel URLs (from agent accounts) and this reads the COMMENTS, where "still available?"/"how much?" buyer questions actually show up. 8M runs, 4.46★/51 reviews.',
    totalRuns: 0,
    target: 'demand',
  },
]

export async function searchApifyActors(query: string): Promise<ActorSearchResult[]> {
  const url = `${APIFY_API}/store?search=${encodeURIComponent(query)}&limit=12`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Apify store search failed: HTTP ${res.status}`)
  const data = await res.json()
  const items = data?.data?.items || []
  return items.map((it: any) => ({
    id: `${it.username}/${it.name}`,
    title: it.title || it.name,
    description: it.description || '',
    totalRuns: it.stats?.totalRuns ?? 0,
  }))
}

interface InputSchemaProp {
  type?: string
  editor?: string
  items?: { type?: string }
}

async function getActorInputSchema(actorId: string, apiKey?: string): Promise<Record<string, InputSchemaProp> | null> {
  const encoded = actorId.replace('/', '~')
  const tokenQs = apiKey ? `?token=${encodeURIComponent(apiKey)}` : ''
  const res = await fetch(`${APIFY_API}/acts/${encoded}/builds/default${tokenQs}`)
  if (!res.ok) return null
  const data = await res.json()
  const raw = data?.data?.inputSchema
  if (!raw) return null
  try {
    const schema = typeof raw === 'string' ? JSON.parse(raw) : raw
    return schema?.properties || null
  } catch {
    return null
  }
}

// Actors that search by plain keywords (e.g. "Sabah", "cari rumah sabah")
// instead of needing pre-found URLs — no manual URL/group hunting required.
// The "regions" settings field doubles as the keyword list for all of these.
export const AUTO_REGION_ACTOR_ID = 'mai_amm/malaysia-property-leads-scraper'
export const TIKTOK_ACTOR_ID = 'clockworks/tiktok-scraper'
export const XIAOHONGSHU_ACTOR_ID = 'habit.zhou/xiaohongshu-pro-scraper'
export const FACEBOOK_SEARCH_ACTOR_ID = 'scraper_one/facebook-posts-search'
export const INSTAGRAM_COMMENT_ACTOR_ID = 'apify/instagram-comment-scraper'
const KEYWORD_SEARCH_ACTOR_IDS = new Set([AUTO_REGION_ACTOR_ID, TIKTOK_ACTOR_ID, XIAOHONGSHU_ACTOR_ID, FACEBOOK_SEARCH_ACTOR_ID])

export function actorSupportsAutoRegions(actorId: string): boolean {
  return actorId === AUTO_REGION_ACTOR_ID
}
export function actorUsesKeywordSearch(actorId: string): boolean {
  return KEYWORD_SEARCH_ACTOR_IDS.has(actorId)
}
// Instagram needs specific post/reel URLs (no caption search exists) — same
// "Target URLs" UI as the Facebook group scrapers, but "Discover Groups" and
// "From a City" only make sense for Facebook, so the UI hides them for this one.
export function actorIsInstagram(actorId: string): boolean {
  return actorId === INSTAGRAM_COMMENT_ACTOR_ID
}

// Facebook system paths that look like a "page name" but aren't one —
// used to reject e.g. Marketplace search links before they're sent to a
// group/page post scraper (which fails the whole run on any invalid URL).
const FACEBOOK_NON_PAGE_PATHS = new Set([
  'marketplace', 'watch', 'events', 'gaming', 'groups', 'help', 'settings',
  'login', 'photo', 'photo.php', 'video', 'reel', 'story.php', 'profile.php', 'search',
])

// Matches the actor's own accepted pattern: /p/<id> or /reel/<id> only —
// profile pages, hashtag pages, and explore links can't be scraped for comments.
export function isValidInstagramPostUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (!/(^|\.)instagram\.com$/.test(u.hostname)) return false
    const segments = u.pathname.split('/').filter(Boolean)
    return (segments[0] === 'p' || segments[0] === 'reel') && !!segments[1]
  } catch {
    return false
  }
}

export function isValidFacebookGroupOrPageUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (!/(^|\.)facebook\.com$/.test(u.hostname)) return false
    const segments = u.pathname.split('/').filter(Boolean)
    // Group ROOT only — deeper paths (/permalink/, /posts/, /user/...) are a
    // single post or member, not a scrapeable group feed.
    if (segments[0] === 'groups' && segments[1]) return segments.length <= 2
    if (segments.length === 1 && !FACEBOOK_NON_PAGE_PATHS.has(segments[0].toLowerCase())) return true
    return false
  } catch {
    return false
  }
}

export interface BuildInputOptions {
  maxResultsPerUrl: number
  includeComments: boolean
  cookies?: string
  regions?: string[]
  transactionType?: 'sale' | 'rent' | 'all'
}

// Build an input payload that matches the target actor's actual schema.
// Known presets get a hand-verified exact input. Anything else gets adapted
// by inspecting the actor's declared input fields (falls back to a
// best-effort generic payload if the schema can't be read).
export async function buildActorInput(
  actorId: string,
  urls: string[],
  opts: BuildInputOptions,
  apiKey?: string,
): Promise<Record<string, any>> {
  if (
    actorId === 'whoareyouanas/facebook-group-scraper' ||
    actorId === 'apify/facebook-posts-scraper' ||
    actorId === 'apify/facebook-groups-scraper'
  ) {
    const validUrls = urls.filter(isValidFacebookGroupOrPageUrl)
    const invalidUrls = urls.filter(u => !isValidFacebookGroupOrPageUrl(u))
    if (validUrls.length === 0) {
      throw new Error(
        `None of your enabled target URLs are Facebook Group/Page links (this actor can't read: ${invalidUrls.join(', ') || 'the URLs provided'}). ` +
        `Use "Discover Facebook Groups" to add real group URLs, or a group/page link like facebook.com/groups/12345.`
      )
    }
    if (actorId === 'whoareyouanas/facebook-group-scraper') {
      const input: Record<string, any> = {
        startUrls: validUrls.map(url => ({ url })),
        maxPosts: opts.maxResultsPerUrl,
        includeComments: opts.includeComments,
      }
      if (opts.cookies?.trim()) {
        try { input.cookies = JSON.parse(opts.cookies) } catch { /* ignore invalid cookie JSON */ }
      }
      return input
    }
    // apify/facebook-groups-scraper and apify/facebook-posts-scraper both
    // just take startUrls + resultsLimit; comments are pulled automatically.
    return {
      startUrls: validUrls.map(url => ({ url })),
      resultsLimit: opts.maxResultsPerUrl,
    }
  }
  if (actorId === AUTO_REGION_ACTOR_ID) {
    // Region-auto mode: the actor builds its own Mudah.my search URLs from
    // plain region names — no target URLs needed at all.
    if (opts.regions && opts.regions.length > 0) {
      return {
        mode: 'auto',
        regions: opts.regions,
        transactionType: opts.transactionType || 'sale',
        maxItems: opts.maxResultsPerUrl,
      }
    }
    return {
      mode: 'urls',
      startUrls: urls.map(url => ({ url })),
      maxItems: opts.maxResultsPerUrl,
    }
  }
  if (actorId === TIKTOK_ACTOR_ID) {
    const keywords = opts.regions && opts.regions.length > 0 ? opts.regions : urls
    return {
      searchQueries: keywords,
      resultsPerPage: opts.maxResultsPerUrl,
      commentsPerPost: opts.includeComments ? 10 : 0,
    }
  }
  if (actorId === XIAOHONGSHU_ACTOR_ID) {
    const keywords = opts.regions && opts.regions.length > 0 ? opts.regions : urls
    if (keywords.length === 0) {
      throw new Error('Add at least one search keyword (e.g. "沙巴买房" or "kota kinabalu property") in the region/keyword box first.')
    }
    return {
      mode: 'search',
      keywords,
      maxItemsPerInput: opts.maxResultsPerUrl,
      fetchComments: opts.includeComments,
    }
  }
  if (actorId === FACEBOOK_SEARCH_ACTOR_ID) {
    // This actor takes ONE query string, not an array — callers that have
    // several phrases go through buildActorInputs below, which yields one
    // run per phrase. "latest" (not "top"/most-popular) matters:
    // "top" resurfaces heavily-boosted agent posts, defeating the point.
    // No hardcoded location pin — covers all of Malaysia; put the place
    // name (Kuching, KL, Kota Kinabalu, etc.) directly in the query phrase
    // instead, e.g. "looking for a place to rent in Kuching".
    const query = opts.regions && opts.regions.length > 0 ? opts.regions[0] : urls[0]
    if (!query) {
      throw new Error('Add a search phrase first — a REQUEST phrase like "looking for a place to rent in Kuching" works far better than a topic word like "Kuching property".')
    }
    return {
      query,
      resultsCount: opts.maxResultsPerUrl,
      searchType: 'latest',
    }
  }
  if (actorId === INSTAGRAM_COMMENT_ACTOR_ID) {
    // No caption/text search exists on Instagram — this actor reads
    // comments off SPECIFIC posts/reels you provide, verified live against
    // the actor's real output (directUrls is its required input field).
    if (urls.length === 0) {
      throw new Error('Add at least one Instagram post/reel URL — paste links to listing posts you want to check the comments on (e.g. https://www.instagram.com/p/ABC123).')
    }
    return {
      directUrls: urls,
      resultsLimit: opts.maxResultsPerUrl,
    }
  }

  // Unknown / custom actor — adapt to its declared schema.
  const props = await getActorInputSchema(actorId, apiKey)
  if (!props) {
    // Schema unreadable (private actor, network issue) — best-effort guess.
    // If the actor rejects it, Apify's own error message is surfaced to the UI.
    return {
      startUrls: urls.map(url => ({ url })),
      maxItems: opts.maxResultsPerUrl,
      resultsLimit: opts.maxResultsPerUrl,
      maxPosts: opts.maxResultsPerUrl,
      includeComments: opts.includeComments,
    }
  }

  const entries = Object.entries(props)

  // Some actors declare several URL-shaped fields (e.g. startUrls + listingUrls
  // + profileUrls for different scrape modes). Filling all of them with the
  // same seed URLs is wrong, so pick exactly one: prefer a field literally
  // named "startUrls" (the near-universal Apify convention for "the seed"),
  // otherwise the first url-shaped field in schema order.
  const isUrlField = (key: string, prop: InputSchemaProp) =>
    prop.type === 'array' && (prop.editor === 'requestListSources' || /url/i.test(key))
  const urlFieldKey =
    entries.find(([k, p]) => k === 'startUrls' && isUrlField(k, p))?.[0]
    ?? entries.find(([k, p]) => isUrlField(k, p))?.[0]

  const input: Record<string, any> = {}
  for (const [key, prop] of entries) {
    if (key === urlFieldKey) {
      if (prop.editor === 'requestListSources') {
        // Apify's standard "Request list" editor always wants {url} objects.
        input[key] = urls.map(url => ({ url }))
      } else if (prop.editor === 'stringList' || prop.items?.type === 'string') {
        input[key] = urls
      } else {
        input[key] = urls.map(url => ({ url }))
      }
    } else if (prop.type === 'integer' && (/^(max)?(results?|items?|posts?|count)$/i.test(key) || /limit$/i.test(key))) {
      input[key] = opts.maxResultsPerUrl
    } else if (/comment/i.test(key) && prop.type === 'boolean') {
      input[key] = opts.includeComments
    } else if (key === 'cookies' && opts.cookies?.trim()) {
      try { input[key] = JSON.parse(opts.cookies) } catch { /* ignore */ }
    }
  }
  return input
}

// One scrape click can need several actor runs: the Facebook posts-search
// actor only accepts a single query string, so covering every configured
// phrase means one run per phrase (previously only the FIRST phrase was ever
// searched — silently dropping the rest). TikTok/Xiaohongshu take the whole
// phrase list natively, so they stay a single run.
export async function buildActorInputs(
  actorId: string,
  urls: string[],
  opts: BuildInputOptions,
  apiKey?: string,
): Promise<Record<string, any>[]> {
  const phrases = opts.regions || []
  if (actorId === FACEBOOK_SEARCH_ACTOR_ID && phrases.length > 1) {
    return Promise.all(
      phrases.map(phrase => buildActorInput(actorId, urls, { ...opts, regions: [phrase] }, apiKey)),
    )
  }
  return [await buildActorInput(actorId, urls, opts, apiKey)]
}

export interface ActorRunResult {
  items: any[]
  costUsd: number
  runUrl: string
}

// Start a run, poll until it finishes (capped), then fetch the dataset.
export async function runActorAndCollect(
  actorId: string,
  input: Record<string, any>,
  apiKey: string,
  maxWaitMs = 4 * 60 * 1000,
): Promise<ActorRunResult> {
  const encoded = actorId.replace('/', '~')

  const startRes = await fetch(`${APIFY_API}/acts/${encoded}/runs?token=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!startRes.ok) {
    const body = await startRes.text().catch(() => '')
    throw new Error(`Apify rejected the run (actor: ${actorId}): HTTP ${startRes.status} — ${body.slice(0, 300)}`)
  }
  const startData = await startRes.json()
  const runId = startData?.data?.id
  if (!runId) throw new Error('Apify did not return a run id')

  const startedAt = Date.now()
  let status = startData?.data?.status || 'READY'
  let runData = startData.data

  while (status === 'READY' || status === 'RUNNING') {
    if (Date.now() - startedAt > maxWaitMs) {
      throw new Error(`Scrape is taking longer than ${Math.round(maxWaitMs / 1000)}s — it may still finish on Apify's side, check console.apify.com/actors/runs`)
    }
    await new Promise(r => setTimeout(r, 4000))
    const statusRes = await fetch(`${APIFY_API}/actor-runs/${runId}?token=${encodeURIComponent(apiKey)}`)
    if (!statusRes.ok) continue
    const statusData = await statusRes.json()
    runData = statusData.data
    status = runData.status
  }

  if (status !== 'SUCCEEDED') {
    throw new Error(`Apify run ended with status "${status}"${runData?.statusMessage ? `: ${runData.statusMessage}` : ''}`)
  }

  const datasetId = runData.defaultDatasetId
  const itemsRes = await fetch(`${APIFY_API}/datasets/${datasetId}/items?token=${encodeURIComponent(apiKey)}&format=json`)
  const items = itemsRes.ok ? await itemsRes.json() : []

  return {
    items: Array.isArray(items) ? items : [],
    costUsd: runData.usageTotalUsd ?? 0,
    runUrl: `https://console.apify.com/actors/runs/${runId}`,
  }
}

// Different actors name their output fields differently — try common
// candidates in order instead of assuming one exact field name.
function pick(item: any, candidates: string[]): string {
  for (const c of candidates) {
    const v = item?.[c]
    if (typeof v === 'string' && v.trim()) return v
    if (typeof v === 'number') return String(v)
  }
  return ''
}

// Actor date fields vary wildly: unix seconds, unix milliseconds (Facebook
// posts-search), or ISO strings (group scraper's `time`). Returns null when
// unparseable so callers can fail open rather than invent a date.
export function parseActorDate(raw: string): Date | null {
  if (!raw) return null
  if (/^\d+$/.test(raw)) {
    const n = Number(raw)
    const ms = n > 1e12 ? n : n * 1000
    const d = new Date(ms)
    return isNaN(d.getTime()) ? null : d
  }
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

export function normalizeActorItem(item: any) {
  // Some actors (e.g. Xiaohongshu) split content into a separate title +
  // body — combine them so keyword/intent matching sees the whole thing.
  const title = pick(item, ['title'])
  const body = pick(item, ['text', 'message', 'postText', 'caption', 'content', 'description', 'bodyText'])
  const text = title && body && title !== body ? `${title}\n${body}` : (body || title)

  // `comments` can be either a numeric count OR a nested array of comment
  // objects, depending on the actor — Xiaohongshu uses `comments`, the
  // official Facebook Groups Scraper uses `topComments`. Check both field
  // names rather than assuming one.
  const commentsArrayField = Array.isArray(item?.comments) ? item.comments
    : Array.isArray(item?.topComments) ? item.topComments
    : []
  const rawComments = commentsArrayField
  const commentsCount = rawComments.length > 0
    ? rawComments.length
    : Number(item?.commentsCount ?? (typeof item?.comments === 'number' ? item.comments : 0)) || 0

  return {
    text,
    // Some actors nest the author under `user`/`author` as an object
    // ({ id, name }) instead of a flat string field.
    author: pick(item, ['authorName', 'author', 'userName', 'pageName', 'profileName', 'name'])
      || item?.user?.name || item?.author?.name
      // TikTok nests the author under authorMeta — nickName is the display
      // name ("Liza IQI"), name is the @handle.
      || item?.authorMeta?.nickName || item?.authorMeta?.name
      // Instagram comment scraper: flat `ownerUsername` on each comment item.
      || pick(item, ['ownerUsername']) || '',
    url: pick(item, ['url', 'postUrl', 'link', 'permalink', 'noteUrl']),
    profileUrl: pick(item, ['authorProfileUrl', 'authorUrl', 'profileUrl', 'userUrl'])
      || item?.authorMeta?.profileUrl
      || (item?.user?.id ? `https://www.facebook.com/${item.user.id}` : '')
      || (item?.author?.id ? `https://www.facebook.com/${item.author.id}` : '')
      || (item?.ownerUsername ? `https://www.instagram.com/${item.ownerUsername}` : ''),
    // Verified per actor: FB posts-search = `timestamp` (unix ms), FB groups
    // = `time` (ISO), TikTok = `createTimeISO`/`createTime` (ISO/unix sec),
    // Xiaohongshu = `publishedAt` (ISO). Never `scrapedAt`/`_createTime` —
    // those are when WE scraped, and would make every stale post look fresh.
    date: pick(item, ['createTimeISO', 'time', 'timestamp', 'publishedAt', 'date', 'createTime', 'createdAt']),
    postedAt: parseActorDate(pick(item, ['createTimeISO', 'time', 'timestamp', 'publishedAt', 'date', 'createTime', 'createdAt'])),
    likes: Number(item?.likes ?? item?.likesCount ?? item?.reactionsCount ?? 0) || 0,
    commentsCount,
    // Nested comment objects, when the actor returned them inline (paid for
    // via fetchComments/includeComments) — each one is a separate potential
    // lead and was previously being discarded unprocessed.
    rawComments: rawComments.map((c: any) => ({
      author: pick(c, ['author', 'authorName', 'userName', 'name', 'profileName']),
      text: pick(c, ['text', 'message', 'content']),
      profileUrl: pick(c, ['profileUrl', 'authorProfileUrl', 'authorUrl']),
      // Comments sometimes carry their own timestamp — more accurate than
      // inheriting the post's date (a fresh comment on an old post is LIVE
      // intent). Null when absent; callers fall back to the post's date.
      postedAt: parseActorDate(pick(c, ['createTimeISO', 'time', 'timestamp', 'publishedAt', 'date', 'createTime'])),
    })).filter((c: { author: string; text: string }) => c.text),
  }
}

// Finds real, currently-existing Facebook Groups by keyword — so the user
// never has to guess/hardcode group URLs (the original bug that started
// this whole rework: 4 hardcoded groups that likely didn't exist).
export const GROUP_DISCOVERY_ACTOR_ID = 'easyapi/facebook-groups-search-scraper'

export interface DiscoveredGroup {
  name: string
  url: string
  memberCount: string
}

export async function discoverFacebookGroups(
  query: string,
  apiKey: string,
  maxItems = 15,
): Promise<{ groups: DiscoveredGroup[]; costUsd: number }> {
  const { items, costUsd } = await runActorAndCollect(
    GROUP_DISCOVERY_ACTOR_ID,
    { searchQuery: query, maxItems },
    apiKey,
    2 * 60 * 1000,
  )
  const groups = items
    .map(item => ({
      name: pick(item, ['name', 'groupName', 'title']),
      url: pick(item, ['url', 'groupUrl', 'link']),
      memberCount: pick(item, ['memberCount', 'members', 'memberCountText']),
    }))
    .filter(g => g.url)
  return { groups, costUsd }
}
