'use client'

import { useEffect, useState, useRef, ChangeEvent } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { actorSupportsAutoRegions, actorUsesKeywordSearch, actorIsInstagram, buildMarketplaceUrls, isValidFacebookGroupOrPageUrl, isValidInstagramPostUrl } from '@/lib/apify-actor'

interface Lead {
  id: number
  name: string
  phone: string
  email: string
  source: string
  message: string
  location: string
  budget: string
  requirement: string
  status: string
  notes: string
  profileUrl: string
  nameVerified: boolean
  postedAt: string | null
  createdAt: string
}

// Quality score lives inside the auto-import notes ("Score: 80/100") — parse
// it out so the list can show it as a badge instead of hiding it in a popup.
function leadScore(notes: string): number | null {
  const m = notes.match(/Score: (\d+)\/100/)
  return m ? parseInt(m[1]) : null
}

// "2h ago" / "3d ago" for scraped posts — freshness is what decides whether
// the lead is worth chasing, so it beats an absolute date at a glance.
function relativeAge(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${Math.max(mins, 1)}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

interface ActorOption {
  id: string
  title: string
  description: string
  totalRuns: number
}

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
  suggestedActors: ActorOption[]
  apifyBalance: number | null
  apifyPlan: string | null
  apifyBalanceError: string | null
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-500/20 text-blue-400 border border-blue-500/20',
  contacted: 'bg-amber-500/20 text-amber-400 border border-amber-500/20',
  qualified: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20',
  converted: 'bg-zinc-500/20 text-zinc-400 border border-white/10',
  lost: 'bg-red-500/20 text-red-400 border border-red-500/20',
}

const SOURCE_ICONS: Record<string, string> = {
  facebook: 'FB',
  instagram: 'IG',
  tiktok: 'TT',
  xiaohongshu: 'XHS',
  mudah: 'MD',
  google: 'G',
  propertyguru: 'PG',
  manual: 'M',
  website: 'W',
  whatsapp: 'WA',
}

export default function LeadHubPage() {
  // Leads state
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSource, setFilterSource] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importData, setImportData] = useState('')
  const [importing, setImporting] = useState(false)
  const [handoffCount, setHandoffCount] = useState(0)

  // Scraper state
  const [settings, setSettings] = useState<ApifySettings | null>(null)
  const [scraping, setScraping] = useState(false)
  const [scrapeResult, setScrapeResult] = useState<{ imported: number; scanned: number; spent: number; aiRejected?: number; staleSkipped?: number; lowQualityRejected?: number; aiFilterAvailable?: boolean } | null>(null)
  const [scrapeError, setScrapeError] = useState<string | null>(null)
  const [showScraper, setShowScraper] = useState(false)
  const [actorQuery, setActorQuery] = useState('')
  const [actorResults, setActorResults] = useState<ActorOption[] | null>(null)
  const [searchingActors, setSearchingActors] = useState(false)
  const [showActorPicker, setShowActorPicker] = useState(false)
  const [marketplaceLocation, setMarketplaceLocation] = useState('')
  const [groupQuery, setGroupQuery] = useState('')
  const [discoveredGroups, setDiscoveredGroups] = useState<{ name: string; url: string; memberCount: string }[] | null>(null)
  const [discoveringGroups, setDiscoveringGroups] = useState(false)
  const [discoverError, setDiscoverError] = useState<string | null>(null)
  const [sourceTab, setSourceTab] = useState<'paste' | 'discover' | 'marketplace'>('paste')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Keep a ref in sync with showScraper so the 30s balance-interval callback
  // always reads the current value instead of a stale closure capture.
  const showScraperRef = useRef(showScraper)
  showScraperRef.current = showScraper

  useEffect(() => {
    fetchLeads()
    fetchSettings()
    fetchHandoffs()
    const balanceInterval = setInterval(() => {
      if (showScraperRef.current) fetchSettings()
    }, 30000)
    return () => clearInterval(balanceInterval)
  }, [filterStatus, filterSource])

  async function fetchHandoffs() {
    try {
      const res = await fetch('/api/followup')
      const data = await res.json()
      setHandoffCount(data.handoffs?.length || 0)
    } catch {}
  }

  async function fetchLeads() {
    const params = new URLSearchParams()
    if (filterStatus !== 'all') params.set('status', filterStatus)
    if (filterSource !== 'all') params.set('source', filterSource)
    const res = await fetch(`/api/leads?${params}`)
    const data = await res.json()
    setLeads(data)
    setLoading(false)
  }

  async function fetchSettings() {
    const res = await fetch('/api/apify')
    const data = await res.json()
    setSettings(data)
  }

  async function updateLead(id: number, updates: Partial<Lead>) {
    await fetch('/api/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    })
    fetchLeads()
    if (selectedLead?.id === id) {
      setSelectedLead(prev => prev ? { ...prev, ...updates } : null)
    }
  }

  async function deleteLead(id: number) {
    if (!confirm('Delete this lead?')) return
    await fetch(`/api/leads?id=${id}`, { method: 'DELETE' })
    fetchLeads()
    setSelectedLead(null)
  }

  async function importLeads() {
    setImporting(true)
    try {
      let parsed: any[]
      try {
        parsed = JSON.parse(importData)
      } catch {
        const lines = importData.trim().split('\n')
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
        parsed = lines.slice(1).map(line => {
          const values = line.split(',')
          const obj: any = {}
          headers.forEach((h, i) => { obj[h] = values[i]?.trim() || '' })
          return obj
        })
      }
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      })
      const result = await res.json()
      alert(`Imported ${result.imported} leads`)
      setIsImportOpen(false)
      setImportData('')
      fetchLeads()
    } catch (err) {
      alert('Failed to import leads')
    }
    setImporting(false)
  }

  async function startScraping() {
    setScraping(true)
    setScrapeResult(null)
    setScrapeError(null)
    try {
      const res = await fetch('/api/apify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'startScraping' }),
      })
      const data = await res.json()
      if (data.error) {
        setScrapeError(data.error)
      } else {
        setScrapeResult(data)
        fetchLeads()
        fetchSettings()
      }
    } catch (err) {
      setScrapeError('Failed to reach the scraper. Check your connection and try again.')
    }
    setScraping(false)
  }

  async function updateSettings(updates: Partial<ApifySettings>) {
    await fetch('/api/apify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateSettings', ...updates }),
    })
    fetchSettings()
  }

  async function searchActors() {
    if (!actorQuery.trim()) return
    setSearchingActors(true)
    try {
      const res = await fetch('/api/apify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'searchActors', query: actorQuery }),
      })
      const data = await res.json()
      setActorResults(data.results || [])
    } catch {
      setActorResults([])
    }
    setSearchingActors(false)
  }

  function selectActor(actor: { id: string; title: string }) {
    updateSettings({ actorId: actor.id, actorTitle: actor.title })
    setShowActorPicker(false)
    setActorResults(null)
    setActorQuery('')
    // "Discover Groups"/"From a City" only exist for Facebook actors — reset
    // so switching to Instagram doesn't land on a tab with no content.
    if (actorIsInstagram(actor.id)) setSourceTab('paste')
  }

  function addTargetUrl(rawUrl: string) {
    if (!settings || !rawUrl.trim()) return
    setUrlError(null)
    // Auto-prefix the protocol so "facebook.com/groups/123" pastes work.
    let url = rawUrl.trim()
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`

    if (settings.targetUrls.some(t => t.url === url)) {
      setUrlError('That URL is already in your target list.')
      return
    }
    // Facebook links must be a real group/page/marketplace target — anything
    // else (posts, profiles, search links, reels...) fails the whole actor
    // run later, so reject it now with a reason instead of silently saving.
    const isMarketplace = /facebook\.com\/marketplace\//i.test(url)
    if (/facebook\.com/i.test(url) && !isMarketplace && !isValidFacebookGroupOrPageUrl(url)) {
      setUrlError('Not a Facebook Group or Page link — use a URL like facebook.com/groups/12345 or facebook.com/PageName. Post, profile, and search links can\'t be scraped.')
      return
    }
    // Instagram's comment scraper needs the exact post/reel, not a profile —
    // it has no caption search at all, so the URL IS the whole target.
    if (/instagram\.com/i.test(url) && !isValidInstagramPostUrl(url)) {
      setUrlError('Not an Instagram post/reel link — use a URL like instagram.com/p/ABC123 or instagram.com/reel/ABC123. Profile and hashtag links can\'t be scraped for comments.')
      return
    }
    const label = url.includes('/groups/') ? 'Group' : isMarketplace ? 'Marketplace' : url.includes('instagram.com') ? 'Instagram Post' : 'Page'
    updateSettings({ targetUrls: [...settings.targetUrls, { url, label, enabled: true }] })
  }

  function addMarketplaceQuickAdd(kind: 'forSale' | 'forRent') {
    if (!settings || !marketplaceLocation.trim()) return
    const urls = buildMarketplaceUrls(marketplaceLocation.trim())
    addTargetUrl(urls[kind])
  }

  function addRegion(region: string) {
    if (!settings || !region.trim()) return
    if (settings.regions.includes(region.trim())) return
    updateSettings({ regions: [...settings.regions, region.trim()] })
  }

  async function discoverGroups() {
    if (!groupQuery.trim()) return
    setDiscoveringGroups(true)
    setDiscoverError(null)
    setDiscoveredGroups(null)
    try {
      const res = await fetch('/api/apify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'discoverGroups', query: groupQuery }),
      })
      const data = await res.json()
      if (data.error) {
        setDiscoverError(data.error)
      } else {
        setDiscoveredGroups(data.groups)
        fetchSettings()
      }
    } catch {
      setDiscoverError('Failed to reach the discovery service.')
    }
    setDiscoveringGroups(false)
  }

  const filtered = leads.filter(l => {
    if (!search) return true
    return (
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search) ||
      l.email.toLowerCase().includes(search.toLowerCase()) ||
      l.location.toLowerCase().includes(search.toLowerCase()) ||
      l.message.toLowerCase().includes(search.toLowerCase())
    )
  })

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    qualified: leads.filter(l => l.status === 'qualified').length,
    converted: leads.filter(l => l.status === 'converted').length,
  }

  return (
    <div className="min-h-screen bg-[#080808]">
      <div className="px-4 sm:px-6 lg:px-10 pt-10 pb-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">Lead Hub</h1>
            <p className="text-zinc-500 mt-2 text-base">Scrape, capture, and manage all your property leads</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setShowScraper(!showScraper)} className="bg-[#E2A93B] hover:bg-[#D49A30] text-black font-semibold px-5 py-3 rounded-xl text-sm">
              {showScraper ? 'Hide Scraper' : 'Lead Scraper'}
            </Button>
            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
              <DialogTrigger render={<button className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-white/10 text-zinc-300 font-semibold text-sm hover:bg-white/5 transition-all" />}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                Import
              </DialogTrigger>
              <DialogContent className="bg-[#0a0a0a] border-white/10 max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl">Import Leads</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <p className="text-sm text-zinc-500">Paste JSON or CSV data</p>
                  <textarea
                    value={importData}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setImportData(e.target.value)}
                    placeholder='[{"name":"John","phone":"60123456789","source":"facebook","message":"Looking for condo"}]'
                    className="w-full h-48 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-zinc-600 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                  <Button onClick={importLeads} disabled={importing} className="w-full bg-white text-black hover:bg-zinc-200 font-semibold h-11 rounded-xl">
                    {importing ? 'Importing...' : 'Import Leads'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Scraper Panel (collapsible) */}
        {showScraper && settings && (() => {
          const isKeywordActor = actorUsesKeywordSearch(settings.actorId)
          const isMudah = actorSupportsAutoRegions(settings.actorId)
          const isInstagram = actorIsInstagram(settings.actorId)
          const canRun = settings.apiKey && settings.actorId &&
            (settings.targetUrls.filter(u => u.enabled).length > 0 || (isKeywordActor && settings.regions.length > 0)) &&
            settings.todaySpent < settings.dailyBudgetMYR
          return (
          <Card className="mb-8 bg-white/[0.03] border-white/5 overflow-visible">
            <CardContent className="p-5 sm:p-6">

              {/* Row 1 — identity + balance */}
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <h3 className="text-base font-semibold text-white">Lead Scraper</h3>
                  <p className="text-xs text-zinc-500">Powered by Apify</p>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${settings.apifyBalance !== null ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                  {settings.apifyBalance !== null ? (
                    <span className="text-sm font-semibold text-white">${settings.apifyBalance.toFixed(2)} <span className="text-zinc-500 font-normal">balance</span></span>
                  ) : settings.apifyBalanceError ? (
                    <span className="text-xs text-red-400">Balance error</span>
                  ) : !settings.apiKey ? (
                    <span className="text-xs text-zinc-500">No API key yet</span>
                  ) : (
                    <span className="text-xs text-zinc-500">Balance unavailable</span>
                  )}
                  <a href="https://console.apify.com/billing" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#E2A93B] hover:text-[#D49A30] transition-colors">
                    Top up
                  </a>
                </div>
              </div>

              {/* Row 2 — actor, key, budget, run: the "always visible" control bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <div>
                  <Label className="text-zinc-500 text-[11px] font-medium uppercase tracking-wider">Actor</Label>
                  <button
                    onClick={() => setShowActorPicker(v => !v)}
                    className="mt-1.5 w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-left transition-colors"
                  >
                    <span className="text-xs font-medium text-white truncate">{settings.actorTitle || 'Choose an actor'}</span>
                    <svg className={`w-3.5 h-3.5 text-zinc-500 flex-shrink-0 transition-transform ${showActorPicker ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>

                <div>
                  <Label className="text-zinc-500 text-[11px] font-medium uppercase tracking-wider">Apify API Key</Label>
                  <Input
                    type="password"
                    value={settings.apiKey}
                    onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                    onBlur={() => updateSettings({ apiKey: settings.apiKey })}
                    placeholder="Enter API token"
                    className="bg-white/5 border-white/10 mt-1.5 h-10 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-zinc-500 text-[11px] font-medium uppercase tracking-wider">Daily Budget</Label>
                  <div className="flex items-center gap-2 mt-1.5 h-10">
                    <input
                      type="range" min="5" max="200" step="5"
                      value={settings.dailyBudgetMYR}
                      onChange={(e) => updateSettings({ dailyBudgetMYR: parseInt(e.target.value) })}
                      className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#E2A93B]"
                    />
                    <span className="text-xs font-semibold text-[#E2A93B] w-14 text-right flex-shrink-0">RM {settings.dailyBudgetMYR}</span>
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-1">RM {settings.todaySpent.toFixed(2)} spent today</p>
                </div>

                <div className="flex flex-col justify-start">
                  <Label className="text-zinc-500 text-[11px] font-medium uppercase tracking-wider sm:opacity-0 sm:select-none">Run</Label>
                  <Button
                    onClick={startScraping}
                    disabled={scraping || !canRun}
                    className="mt-1.5 bg-[#E2A93B] hover:bg-[#D49A30] text-black font-semibold h-10 rounded-xl disabled:opacity-40 text-xs"
                  >
                    {scraping ? 'Scraping…' : settings.todaySpent >= settings.dailyBudgetMYR ? 'Budget reached' : 'Start Scraping'}
                  </Button>
                </div>
              </div>

              {(scrapeResult || scrapeError) && (
                <div className={`mb-5 px-3 py-2 rounded-lg text-xs ${scrapeError ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                  {scrapeError ? `⚠ ${scrapeError}` : (
                    <>
                      ✅ Scanned {scrapeResult!.scanned} posts, imported {scrapeResult!.imported} new leads (RM {scrapeResult!.spent.toFixed(2)} today)
                      {(scrapeResult!.staleSkipped ?? 0) > 0 && <span className="text-zinc-500"> · {scrapeResult!.staleSkipped} old posts skipped (30d+)</span>}
                      {(scrapeResult!.lowQualityRejected ?? 0) > 0 && <span className="text-zinc-500"> · {scrapeResult!.lowQualityRejected} low-quality skipped</span>}
                      {scrapeResult!.aiFilterAvailable
                        ? <span className="text-zinc-500"> · AI filter rejected {scrapeResult!.aiRejected ?? 0} ads</span>
                        : <span className="text-amber-500/80"> · AI filter offline (Ollama not reachable) — kept everything that passed keyword scoring</span>}
                    </>
                  )}
                </div>
              )}

              {/* Actor picker — opens under the control bar, closed by default */}
              {showActorPicker && (
                <div className="mb-5 p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-4">
                  <div>
                    <p className="text-[11px] text-zinc-500 mb-2 uppercase tracking-wider font-medium">Suggested actors</p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {settings.suggestedActors.map(a => (
                        <button
                          key={a.id}
                          onClick={() => selectActor(a)}
                          title={a.description}
                          className={`text-left px-3 py-2.5 rounded-lg text-xs transition-colors ${settings.actorId === a.id ? 'bg-[#E2A93B] text-black font-semibold' : 'bg-white/5 text-zinc-300 hover:bg-white/10'}`}
                        >
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{a.title}</p>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold">Buyers & renters</span>
                          </div>
                          <p className={`mt-0.5 line-clamp-2 ${settings.actorId === a.id ? 'text-black/70' : 'text-zinc-500'}`}>{a.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 pt-1">
                    <div className="flex-1">
                      <p className="text-[11px] text-zinc-500 mb-2 uppercase tracking-wider font-medium">Search Apify store</p>
                      <div className="flex gap-2">
                        <input
                          type="text" value={actorQuery} onChange={(e) => setActorQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && searchActors()}
                          placeholder="e.g. instagram, marketplace..."
                          className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-zinc-600"
                        />
                        <button onClick={searchActors} disabled={searchingActors} className="px-3 py-2 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white disabled:opacity-50 flex-shrink-0">
                          {searchingActors ? '…' : 'Search'}
                        </button>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] text-zinc-500 mb-2 uppercase tracking-wider font-medium">Or paste an actor ID</p>
                      <Input
                        placeholder="username/actor-name"
                        className="bg-white/5 border-white/10 h-9 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                            selectActor({ id: e.currentTarget.value.trim(), title: e.currentTarget.value.trim() })
                          }
                        }}
                      />
                    </div>
                  </div>

                  {actorResults && (
                    <div className="space-y-1.5 max-h-52 overflow-y-auto">
                      {actorResults.length === 0 && <p className="text-xs text-zinc-600">No actors found.</p>}
                      {actorResults.map(a => (
                        <button key={a.id} onClick={() => selectActor(a)} className="w-full text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                          <p className="text-xs font-medium text-white">{a.title} <span className="text-zinc-500">· {a.id}</span></p>
                          <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1">{a.description}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Source — the ONE thing that actually changes based on the actor */}
              <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
                {isKeywordActor ? (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-white text-xs font-semibold">Search keywords</Label>
                      {isMudah && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-zinc-400">Listings, not buyer/renter posts</span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 mb-3">
                      {isMudah
                        ? 'Type a place anywhere in Malaysia — e.g. "Sabah", "Sarawak", "Kuching", "Kuala Lumpur" — no URLs needed.'
                        : 'Type search terms — e.g. "cari rumah sarawak", "kuching apartment", "吉隆坡买房" — mix languages and states freely. Every phrase gets searched on each run.'}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {settings.regions.map((r, i) => (
                        <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E2A93B]/15 text-[#E2A93B] text-xs border border-[#E2A93B]/25">
                          {r}
                          <button onClick={() => updateSettings({ regions: settings.regions.filter((_, j) => j !== i) })} className="hover:text-red-400">×</button>
                        </span>
                      ))}
                      <input
                        type="text"
                        placeholder="Type and press Enter..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                            addRegion(e.currentTarget.value.trim())
                            e.currentTarget.value = ''
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-zinc-600 w-56"
                      />
                    </div>
                    {isMudah && (
                      <div className="flex items-center gap-2">
                        <Label className="text-zinc-500 text-[11px]">Looking for:</Label>
                        <Select value={settings.transactionType} onValueChange={(v) => updateSettings({ transactionType: (v || 'sale') as any })}>
                          <SelectTrigger className="w-32 h-8 bg-white/5 border-white/10 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#111] border-white/10">
                            <SelectItem value="sale">For Sale</SelectItem>
                            <SelectItem value="rent">For Rent</SelectItem>
                            <SelectItem value="all">Both</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <Label className="text-white text-xs font-semibold">Target URLs</Label>
                    <p className="text-[11px] text-zinc-500 mt-1 mb-3">
                      {isInstagram
                        ? 'Instagram has no caption search — paste specific listing post/reel URLs (from agent accounts) and this reads the comments underneath for buyer questions.'
                        : 'Facebook Groups or Pages this actor should scrape.'}
                    </p>

                    {/* tabs: three ways to add a URL to the same list — Discover/From a City are Facebook-specific */}
                    <div className="flex gap-1 mb-3 p-1 rounded-lg bg-black/20 w-fit">
                      {(isInstagram
                        ? ([['paste', 'Paste URL']] as const)
                        : ([['paste', 'Paste URL'], ['discover', 'Discover Groups'], ['marketplace', 'From a City']] as const)
                      ).map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => setSourceTab(key)}
                          className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${sourceTab === key ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {sourceTab === 'paste' && (
                      <div>
                        <input
                          type="text"
                          placeholder={isInstagram ? 'Paste an Instagram post/reel URL and press Enter...' : 'Paste a Facebook Group/Page URL and press Enter...'}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                              addTargetUrl(e.currentTarget.value.trim())
                              e.currentTarget.value = ''
                            }
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-zinc-600"
                        />
                        {urlError && <p className="text-xs text-red-400 mt-2 break-words">⚠ {urlError}</p>}
                      </div>
                    )}

                    {!isInstagram && sourceTab === 'discover' && (
                      <div>
                        <p className="text-[11px] text-zinc-500 mb-2">Finds real, currently-existing Facebook groups — small Apify cost per search.</p>
                        <div className="flex gap-2">
                          <input
                            type="text" value={groupQuery} onChange={(e) => setGroupQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && discoverGroups()}
                            placeholder="e.g. Sarawak property, KL rumah sewa..."
                            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-zinc-600"
                          />
                          <button onClick={discoverGroups} disabled={discoveringGroups || !groupQuery.trim()} className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#E2A93B]/20 hover:bg-[#E2A93B]/30 text-[#E2A93B] disabled:opacity-50 flex-shrink-0">
                            {discoveringGroups ? 'Searching…' : 'Discover'}
                          </button>
                        </div>
                        {discoverError && <p className="text-xs text-red-400 mt-2 break-words">⚠ {discoverError}</p>}
                        {discoveredGroups && (
                          <div className="mt-2 space-y-1.5 max-h-56 overflow-y-auto">
                            {discoveredGroups.length === 0 && <p className="text-xs text-zinc-600">No groups found for that search.</p>}
                            {discoveredGroups.map((g, i) => {
                              const alreadyAdded = settings?.targetUrls.some(t => t.url === g.url)
                              return (
                                <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/5">
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium text-white truncate">{g.name || g.url}</p>
                                    <p className="text-[11px] text-zinc-500 truncate">{g.memberCount ? `${g.memberCount} · ` : ''}{g.url}</p>
                                  </div>
                                  <button
                                    onClick={() => addTargetUrl(g.url)}
                                    disabled={alreadyAdded}
                                    className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#E2A93B]/20 hover:bg-[#E2A93B]/30 text-[#E2A93B] disabled:opacity-40"
                                  >
                                    {alreadyAdded ? 'Added' : '+ Add'}
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {!isInstagram && sourceTab === 'marketplace' && (
                      <div>
                        <p className="text-[11px] text-zinc-500 mb-2">Adds the city's Marketplace page — sellers/landlords, not people looking to buy or rent.</p>
                        <div className="flex flex-wrap gap-2">
                          <input
                            type="text" value={marketplaceLocation} onChange={(e) => setMarketplaceLocation(e.target.value)}
                            placeholder="e.g. Kota Kinabalu"
                            className="flex-1 min-w-[160px] px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-zinc-600"
                          />
                          <button onClick={() => addMarketplaceQuickAdd('forSale')} disabled={!marketplaceLocation.trim()} className="px-3 py-2 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white disabled:opacity-40">+ For Sale</button>
                          <button onClick={() => addMarketplaceQuickAdd('forRent')} disabled={!marketplaceLocation.trim()} className="px-3 py-2 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white disabled:opacity-40">+ For Rent</button>
                        </div>
                      </div>
                    )}

                    {settings.targetUrls.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/5">
                        {settings.targetUrls.map((t, i) => (
                          <span key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border ${t.enabled ? 'bg-[#E2A93B]/15 text-[#E2A93B] border-[#E2A93B]/25' : 'bg-white/5 text-zinc-500 border-white/5'}`}>
                            <button
                              onClick={() => {
                                const next = [...settings.targetUrls]
                                next[i] = { ...next[i], enabled: !next[i].enabled }
                                updateSettings({ targetUrls: next })
                              }}
                              title={t.enabled ? 'Click to disable' : 'Click to enable'}
                            >
                              {t.label}: {t.url.replace(/^https?:\/\/(www\.)?facebook\.com\//, '')}
                            </button>
                            <button onClick={() => updateSettings({ targetUrls: settings.targetUrls.filter((_, j) => j !== i) })} className="text-zinc-600 hover:text-red-400">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Advanced — quality filter keywords, collapsed by default */}
              <div className="mt-3">
                <button onClick={() => setShowAdvancedFilters(v => !v)} className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">
                  <svg className={`w-3 h-3 transition-transform ${showAdvancedFilters ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  Advanced: quality filter keywords ({settings.targetKeywords.length})
                </button>
                {showAdvancedFilters && (
                  <div className="flex flex-wrap gap-2 mt-2.5">
                    {settings.targetKeywords.map((kw, i) => (
                      <span key={i} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 text-xs text-zinc-400 border border-white/5">
                        {kw}
                        <button onClick={() => updateSettings({ targetKeywords: settings.targetKeywords.filter((_, j) => j !== i) })} className="text-zinc-600 hover:text-red-400">×</button>
                      </span>
                    ))}
                    <input
                      type="text"
                      placeholder="Add keyword..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          updateSettings({ targetKeywords: [...settings.targetKeywords, e.currentTarget.value.trim()] })
                          e.currentTarget.value = ''
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-xs text-white placeholder:text-zinc-600 w-28"
                    />
                  </div>
                )}
              </div>

            </CardContent>
          </Card>
          )
        })()}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total', value: stats.total, color: 'text-white' },
            { label: 'New', value: stats.new, color: 'text-blue-400' },
            { label: 'Contacted', value: stats.contacted, color: 'text-amber-400' },
            { label: 'Qualified', value: stats.qualified, color: 'text-emerald-400' },
            { label: 'Converted', value: stats.converted, color: 'text-zinc-400' },
          ].map((s, i) => (
            <div key={i} className="bg-white/5 rounded-2xl p-5 border border-white/5">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-zinc-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Follow-up Alert */}
        {stats.contacted > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-8 flex items-center gap-3">
            <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-amber-300 font-medium">{stats.contacted} leads need follow-up</p>
              <p className="text-xs text-amber-400/70">Leads contacted 3+ days ago without conversion</p>
            </div>
          </div>
        )}

        {/* Handoff Alert */}
        {handoffCount > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-8 flex items-center gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-red-300 font-medium">{handoffCount} customers want to talk to Jackson</p>
              <p className="text-xs text-red-400/70">They requested a real person — respond soon!</p>
            </div>
            <button
              onClick={() => window.open('/api/followup', '_blank')}
              className="px-3 py-1.5 text-xs font-medium bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
            >
              View
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-white/5 border border-white/5 flex-1">
            <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
            <Input
              placeholder="Search leads..."
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="border-0 bg-transparent p-0 text-sm text-white placeholder:text-zinc-600 focus-visible:ring-0 w-full"
            />
          </div>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v || 'all')}>
            <SelectTrigger className="w-[140px] h-11 bg-white/5 border-white/5 rounded-xl text-sm">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="bg-[#111] border-white/10">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterSource} onValueChange={(v) => setFilterSource(v || 'all')}>
            <SelectTrigger className="w-[140px] h-11 bg-white/5 border-white/5 rounded-xl text-sm">
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent className="bg-[#111] border-white/10">
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
              <SelectItem value="xiaohongshu">Xiaohongshu</SelectItem>
              <SelectItem value="mudah">Mudah.my</SelectItem>
              <SelectItem value="apify">Apify</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-zinc-500 flex items-center px-2">{filtered.length} leads</span>
        </div>
      </div>

      {/* Leads Table */}
      <div className="px-4 sm:px-6 lg:px-10 pb-10">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 bg-white/5 rounded-2xl border border-white/5">
            <svg className="w-16 h-16 mx-auto text-zinc-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
            <p className="text-zinc-500 text-lg">No leads yet</p>
            <p className="text-zinc-700 text-sm mt-1">Click "Lead Scraper" above to start finding leads, or import from CSV</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(lead => (
              <div
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-zinc-400">{SOURCE_ICONS[lead.source] || lead.source[0]?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{lead.name || 'Unknown'}</span>
                    {lead.nameVerified && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-medium">✓ Verified</span>
                    )}
                    {!lead.nameVerified && lead.name && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-medium">Unverified</span>
                    )}
                    {lead.phone && <span className="text-zinc-500 text-sm">{lead.phone}</span>}
                  </div>
                  <p className="text-zinc-500 text-sm truncate mt-0.5">{lead.message || lead.requirement || 'No message'}</p>
                  {lead.profileUrl && (
                    <a href={lead.profileUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-blue-400 hover:underline mt-0.5 inline-block">
                      View Facebook Profile →
                    </a>
                  )}
                </div>
                <div className="hidden sm:flex items-center gap-6 text-sm text-zinc-500">
                  {lead.location && <span>{lead.location}</span>}
                  {lead.budget && <span className="text-zinc-400">{/^\d/.test(lead.budget) ? `RM ${lead.budget}` : lead.budget}</span>}
                </div>
                {(() => {
                  const s = leadScore(lead.notes)
                  return s !== null ? (
                    <span
                      title={`Lead quality score: ${s}/100`}
                      className={`hidden sm:inline-block px-2 py-1 rounded-md text-[11px] font-semibold ${
                        s >= 70 ? 'bg-emerald-500/15 text-emerald-400' : s >= 45 ? 'bg-amber-500/15 text-amber-400' : 'bg-white/5 text-zinc-500'
                      }`}
                    >
                      {s}
                    </span>
                  ) : null
                })()}
                <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${STATUS_COLORS[lead.status] || STATUS_COLORS.new}`}>
                  {lead.status}
                </span>
                <span className={`text-xs w-20 text-right ${lead.postedAt ? 'text-emerald-500/80 font-medium' : 'text-zinc-600'}`} title={lead.postedAt ? `Posted ${new Date(lead.postedAt).toLocaleString()}` : `Imported ${new Date(lead.createdAt).toLocaleDateString()}`}>
                  {lead.postedAt ? relativeAge(lead.postedAt) : new Date(lead.createdAt).toLocaleDateString()}
                </span>
                <div className="flex gap-2">
                  {lead.phone && (
                    <a
                      href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setSelectedLead(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-[#0a0a0a] rounded-t-3xl sm:rounded-2xl border border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedLead.name || 'Unknown Lead'}</h3>
                  <p className="text-zinc-500 text-sm">{selectedLead.phone || selectedLead.email || 'No contact'}</p>
                </div>
                <button onClick={() => setSelectedLead(null)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 hover:bg-white/20">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Status</Label>
                  <Select value={selectedLead.status} onValueChange={(v) => v && updateLead(selectedLead.id, { status: v })}>
                    <SelectTrigger className="bg-white/5 border-white/10 mt-1.5 h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111] border-white/10">
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Source</Label>
                    <p className="text-white mt-1.5 capitalize">{selectedLead.source}</p>
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">{selectedLead.postedAt ? 'Posted' : 'Date Added'}</Label>
                    <p className="text-white mt-1.5">
                      {selectedLead.postedAt
                        ? `${relativeAge(selectedLead.postedAt)} (${new Date(selectedLead.postedAt).toLocaleString()})`
                        : new Date(selectedLead.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {selectedLead.location && (
                  <div>
                    <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Location</Label>
                    <p className="text-white mt-1.5">{selectedLead.location}</p>
                  </div>
                )}
                {selectedLead.budget && (
                  <div>
                    <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Budget</Label>
                    <p className="text-white mt-1.5">{/^\d/.test(selectedLead.budget) ? `RM ${selectedLead.budget}` : selectedLead.budget}</p>
                  </div>
                )}
                {selectedLead.profileUrl && (
                  <div>
                    <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Profile</Label>
                    <a href={selectedLead.profileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline mt-1.5 text-sm inline-block">
                      View Facebook Profile →
                    </a>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Name Verified</Label>
                  <button
                    onClick={() => updateLead(selectedLead.id, { nameVerified: !selectedLead.nameVerified })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${selectedLead.nameVerified ? 'bg-emerald-500' : 'bg-white/10'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${selectedLead.nameVerified ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
                {selectedLead.message && (
                  <div>
                    <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Message</Label>
                    <p className="text-white mt-1.5">{selectedLead.message}</p>
                  </div>
                )}
                <div>
                  <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Notes</Label>
                  <textarea
                    value={selectedLead.notes}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setSelectedLead({ ...selectedLead, notes: e.target.value })}
                    onBlur={() => updateLead(selectedLead.id, { notes: selectedLead.notes })}
                    placeholder="Add notes..."
                    className="w-full h-20 px-3 py-2 mt-1.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  {selectedLead.phone && (
                    <a
                      href={`https://wa.me/${selectedLead.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all"
                    >
                      WhatsApp
                    </a>
                  )}
                  <Button
                    onClick={() => deleteLead(selectedLead.id)}
                    variant="ghost"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
