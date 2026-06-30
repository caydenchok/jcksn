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
  createdAt: string
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

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSource, setFilterSource] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importData, setImportData] = useState('')
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    fetchLeads()
  }, [filterStatus, filterSource])

  async function fetchLeads() {
    const params = new URLSearchParams()
    if (filterStatus !== 'all') params.set('status', filterStatus)
    if (filterSource !== 'all') params.set('source', filterSource)

    const res = await fetch(`/api/leads?${params}`)
    const data = await res.json()
    setLeads(data)
    setLoading(false)
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
        // Try CSV format
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
      <div className="px-10 pt-10 pb-0">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h1 className="text-5xl font-bold tracking-tight text-white">Leads</h1>
            <p className="text-zinc-500 mt-2 text-base">Manage and track your property leads</p>
          </div>
          <div className="flex gap-3">
            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
              <DialogTrigger render={<button className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-white/10 text-zinc-300 font-semibold text-sm hover:bg-white/5 transition-all" />}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                Import Leads
              </DialogTrigger>
              <DialogContent className="bg-[#0a0a0a] border-white/10 max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl">Import Leads</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <p className="text-sm text-zinc-500">Paste JSON or CSV data. CSV should have headers: name, phone, email, location, message, source</p>
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
              <SelectItem value="google">Google</SelectItem>
              <SelectItem value="propertyguru">PropertyGuru</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="website">Website</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-zinc-500 flex items-center px-2">{filtered.length} leads</span>
        </div>
      </div>

      {/* Leads Table */}
      <div className="px-10 pb-10">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 bg-white/5 rounded-2xl border border-white/5">
            <svg className="w-16 h-16 mx-auto text-zinc-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
            <p className="text-zinc-500 text-lg">No leads found</p>
            <p className="text-zinc-700 text-sm mt-1">Import leads from Facebook, Instagram, or Apify</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(lead => (
              <div
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all cursor-pointer"
              >
                {/* Source badge */}
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-zinc-400">{SOURCE_ICONS[lead.source] || lead.source[0]?.toUpperCase()}</span>
                </div>

                {/* Lead info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{lead.name || 'Unknown'}</span>
                    {lead.phone && <span className="text-zinc-500 text-sm">{lead.phone}</span>}
                  </div>
                  <p className="text-zinc-500 text-sm truncate mt-0.5">{lead.message || lead.requirement || 'No message'}</p>
                </div>

                {/* Location & budget */}
                <div className="hidden sm:flex items-center gap-6 text-sm text-zinc-500">
                  {lead.location && <span>{lead.location}</span>}
                  {lead.budget && <span className="text-zinc-400">RM {lead.budget}</span>}
                </div>

                {/* Status */}
                <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${STATUS_COLORS[lead.status] || STATUS_COLORS.new}`}>
                  {lead.status}
                </span>

                {/* Date */}
                <span className="text-xs text-zinc-600 w-20 text-right">
                  {new Date(lead.createdAt).toLocaleDateString()}
                </span>

                {/* Actions */}
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
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
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
