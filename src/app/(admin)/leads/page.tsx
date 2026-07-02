'use client'

import { useEffect, useState, ChangeEvent } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
  createdAt: string
}

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
  const [scrapeResult, setScrapeResult] = useState<{ imported: number; spent: number } | null>(null)
  const [showScraper, setShowScraper] = useState(false)

  useEffect(() => {
    fetchLeads()
    fetchSettings()
    fetchHandoffs()
    // Auto-refresh balance every 30 seconds when scraper is open
    const balanceInterval = setInterval(() => {
      if (showScraper) fetchSettings()
    }, 30000)
    return () => clearInterval(balanceInterval)
  }, [filterStatus, filterSource, showScraper])

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
    try {
      const res = await fetch('/api/apify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'startScraping' }),
      })
      const data = await res.json()
      if (data.error) {
        alert(data.error)
      } else {
        setScrapeResult(data)
        fetchLeads()
        fetchSettings()
      }
    } catch (err) {
      alert('Failed to start scraping')
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
        {showScraper && settings && (
          <div className="mb-8 p-6 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Facebook Lead Scraper</h3>
              <span className="text-xs text-zinc-500">Powered by Apify</span>
            </div>

            {/* Live Apify Balance */}
            <div className="flex items-center gap-4 mb-4 p-4 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${settings.apifyBalance !== null ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                  <span className="text-xs text-zinc-400 uppercase tracking-wider">Apify Balance</span>
                  {settings.apifyPlan && (
                    <span className="text-xs bg-white/10 text-zinc-400 px-2 py-0.5 rounded-full">{settings.apifyPlan}</span>
                  )}
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  {settings.apifyBalance !== null ? (
                    <span className="text-2xl font-bold text-white">${settings.apifyBalance.toFixed(2)}</span>
                  ) : settings.apifyBalanceError ? (
                    <span className="text-sm text-red-400">Error: {settings.apifyBalanceError}</span>
                  ) : (
                    <span className="text-sm text-zinc-500">Set API key to see balance</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={fetchSettings}
                  className="px-3 py-2 text-xs font-medium bg-white/5 hover:bg-white/10 text-zinc-400 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                  </svg>
                  Refresh
                </button>
                <a
                  href="https://console.apify.com/billing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 text-xs font-semibold bg-[#E2A93B] hover:bg-[#D49A30] text-black rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Top Up
                </a>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
              {/* Budget */}
              <div>
                <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Daily Budget (MYR)</Label>
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="range"
                    min="5"
                    max="200"
                    step="5"
                    value={settings.dailyBudgetMYR}
                    onChange={(e) => updateSettings({ dailyBudgetMYR: parseInt(e.target.value) })}
                    className="flex-1 h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#E2A93B]"
                  />
                  <span className="text-lg font-bold text-[#E2A93B] w-16 text-right">RM {settings.dailyBudgetMYR}</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-[#E2A93B] rounded-full transition-all" style={{ width: `${Math.min((settings.todaySpent / settings.dailyBudgetMYR) * 100, 100)}%` }} />
                </div>
                <p className="text-xs text-zinc-500 mt-1">RM {settings.todaySpent.toFixed(2)} spent · RM {(settings.dailyBudgetMYR - settings.todaySpent).toFixed(2)} left</p>
              </div>

              {/* API Key */}
              <div>
                <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Apify API Key</Label>
                <Input
                  type="password"
                  value={settings.apiKey}
                  onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                  onBlur={() => updateSettings({ apiKey: settings.apiKey })}
                  placeholder="Enter API token"
                  className="bg-white/5 border-white/10 mt-2 h-10"
                />
              </div>

              {/* Run Button */}
              <div className="flex flex-col justify-end">
                <Button
                  onClick={startScraping}
                  disabled={scraping || !settings.apiKey || settings.apiKey === 'YOUR_APIFY_TOKEN_HERE' || settings.todaySpent >= settings.dailyBudgetMYR}
                  className="bg-[#E2A93B] hover:bg-[#D49A30] text-black font-semibold h-10 rounded-xl disabled:opacity-50"
                >
                  {scraping ? 'Scraping...' : settings.todaySpent >= settings.dailyBudgetMYR ? 'Budget Reached' : 'Start Scraping'}
                </Button>
                {scrapeResult && (
                  <p className="text-xs text-emerald-400 mt-2">✅ Scraped {scrapeResult.imported} leads (RM {scrapeResult.spent.toFixed(2)})</p>
                )}
              </div>
            </div>

            {/* Target Groups */}
            <div className="mb-4">
              <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Target Groups</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {settings.targetGroups.map((group, i) => (
                  <label key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all ${group.enabled ? 'bg-[#E2A93B]/20 text-[#E2A93B] border border-[#E2A93B]/30' : 'bg-white/5 text-zinc-500 border border-white/5'}`}>
                    <input
                      type="checkbox"
                      checked={group.enabled}
                      onChange={(e) => {
                        const newGroups = [...settings.targetGroups]
                        newGroups[i].enabled = e.target.checked
                        updateSettings({ targetGroups: newGroups })
                      }}
                      className="sr-only"
                    />
                    {group.name}
                  </label>
                ))}
              </div>
            </div>

            {/* Target Keywords */}
            <div>
              <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Target Keywords</Label>
              <div className="flex flex-wrap gap-2 mt-2">
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
            </div>
          </div>
        )}

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
                  {lead.budget && <span className="text-zinc-400">RM {lead.budget}</span>}
                </div>
                <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${STATUS_COLORS[lead.status] || STATUS_COLORS.new}`}>
                  {lead.status}
                </span>
                <span className="text-xs text-zinc-600 w-20 text-right">
                  {new Date(lead.createdAt).toLocaleDateString()}
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
                    <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Date</Label>
                    <p className="text-white mt-1.5">{new Date(selectedLead.createdAt).toLocaleDateString()}</p>
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
                    <p className="text-white mt-1.5">RM {selectedLead.budget}</p>
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
