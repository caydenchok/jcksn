'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Handoff {
  phone: string
  name: string
  lastActive: string
  handoffNote: string
  followUpCount: number
}

export default function FollowupsPage() {
  const [callRequests, setCallRequests] = useState<Handoff[]>([])
  const [chatRequests, setChatRequests] = useState<Handoff[]>([])
  const [inactive, setInactive] = useState<Handoff[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string | null>(null)

  useEffect(() => {
    fetchFollowups()
    const interval = setInterval(fetchFollowups, 15000)
    return () => clearInterval(interval)
  }, [])

  async function fetchFollowups() {
    try {
      const res = await fetch('/api/followup')
      const data = await res.json()
      const all = data.handoffs || []
      setCallRequests(all.filter((h: Handoff) => h.handoffNote?.includes('CALL REQUEST')))
      setChatRequests(all.filter((h: Handoff) => !h.handoffNote?.includes('CALL REQUEST')))
      setInactive(data.inactive || [])
    } catch {}
    setLoading(false)
  }

  async function sendFollowUp(phone: string) {
    setSending(phone)
    try {
      await fetch('/api/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, type: 'send_followup' }),
      })
      fetchFollowups()
    } catch {}
    setSending(null)
  }

  async function markComplete(phone: string) {
    try {
      await fetch('/api/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, type: 'handoff_complete' }),
      })
      fetchFollowups()
    } catch {}
  }

  async function sendBulkFollowup() {
    try {
      await fetch('/api/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'send_bulk_followup' }),
      })
      fetchFollowups()
    } catch {}
  }

  const totalPending = callRequests.length + chatRequests.length

  return (
    <div className="min-h-screen bg-[#080808]">
      <div className="px-4 sm:px-6 lg:px-10 pt-10 pb-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">Follow-ups</h1>
            {totalPending > 0 && (
              <span className="px-3 py-1 text-sm font-bold bg-red-500 text-white rounded-full">{totalPending}</span>
            )}
          </div>
          <p className="text-zinc-500 mt-2 text-base">Call requests, chat handoffs, and inactive conversations</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="bg-[#0c0c0c] border-amber-500/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Call Requests</p>
                  <p className="text-3xl font-bold text-amber-400 mt-1">{callRequests.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-zinc-600 mt-2">Customers asking for a call</p>
            </CardContent>
          </Card>

          <Card className="bg-[#0c0c0c] border-red-500/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Chat Requests</p>
                  <p className="text-3xl font-bold text-red-400 mt-1">{chatRequests.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-zinc-600 mt-2">Want to talk to Jackson</p>
            </CardContent>
          </Card>

          <Card className="bg-[#0c0c0c] border-zinc-500/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Inactive (2+ days)</p>
                  <p className="text-3xl font-bold text-zinc-400 mt-1">{inactive.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-zinc-500/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-zinc-600 mt-2">Conversations gone quiet</p>
            </CardContent>
          </Card>
        </div>

        {/* Call Requests */}
        {callRequests.length > 0 && (
          <Card className="bg-[#0c0c0c] border-amber-500/20 mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                Call Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {callRequests.map((h) => (
                <div key={h.phone} className="flex items-center justify-between p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">{h.name || 'Unknown'}</p>
                      <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">📞 Call</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">📱 {h.phone}</p>
                    <p className="text-xs text-zinc-500 mt-1">{new Date(h.lastActive).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2 ml-3">
                    <a href={`tel:${h.phone}`} className="px-4 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-black rounded-lg transition-colors flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                      </svg>
                      Call Now
                    </a>
                    <button onClick={() => markComplete(h.phone)} className="px-3 py-2 text-xs font-medium bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors">
                      Done
                    </button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Chat Requests */}
        {chatRequests.length > 0 && (
          <Card className="bg-[#0c0c0c] border-red-500/10 mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Chat Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {chatRequests.map((h) => (
                <div key={h.phone} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">{h.name || h.phone}</p>
                      <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">💬 Chat</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">📱 {h.phone}</p>
                    <p className="text-xs text-zinc-500 mt-1 truncate">{h.handoffNote}</p>
                    <p className="text-xs text-zinc-600 mt-1">{new Date(h.lastActive).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2 ml-3">
                    <button onClick={() => sendFollowUp(h.phone)} disabled={sending === h.phone} className="px-3 py-1.5 text-xs font-medium bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors disabled:opacity-50">
                      {sending === h.phone ? 'Sending...' : 'Reply'}
                    </button>
                    <button onClick={() => markComplete(h.phone)} className="px-3 py-1.5 text-xs font-medium bg-zinc-500/20 hover:bg-zinc-500/30 text-zinc-400 rounded-lg transition-colors">
                      Done
                    </button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Inactive Conversations */}
        {inactive.length > 0 && (
          <Card className="bg-[#0c0c0c] border-white/[0.04] mb-6">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Inactive Conversations
                </CardTitle>
                <Button onClick={sendBulkFollowup} variant="outline" className="text-xs border-white/10 text-zinc-400 hover:text-white">
                  Send Bulk Follow-up
                </Button>
              </div>
              <p className="text-xs text-zinc-500 mt-1">No activity for 2+ days — send a check-in message</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {inactive.map((h) => (
                <div key={h.phone} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">{h.name || h.phone}</p>
                      <span className="text-xs bg-zinc-500/20 text-zinc-400 px-2 py-0.5 rounded-full">⏰ {h.followUpCount}/3 sent</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">📱 {h.phone}</p>
                    <p className="text-xs text-zinc-600 mt-1">Last active: {new Date(h.lastActive).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2 ml-3">
                    {h.followUpCount < 3 ? (
                      <button onClick={() => sendFollowUp(h.phone)} disabled={sending === h.phone} className="px-3 py-1.5 text-xs font-medium bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors disabled:opacity-50">
                        {sending === h.phone ? 'Sending...' : 'Send Check-in'}
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-600 px-3 py-1.5">Max sent</span>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {callRequests.length === 0 && chatRequests.length === 0 && inactive.length === 0 && (
          <Card className="bg-[#0c0c0c] border-white/[0.04]">
            <CardContent className="py-16 text-center">
              <svg className="w-16 h-16 mx-auto text-zinc-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-zinc-500 font-medium text-lg">All clear!</p>
              <p className="text-zinc-600 text-sm mt-2">No pending follow-ups or call requests</p>
              <p className="text-zinc-600 text-sm mt-1">New requests will appear here automatically</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
