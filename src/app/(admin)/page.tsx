'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Stats {
  totalProperties: number
  availableProperties: number
  totalBookings: number
  pendingBookings: number
  totalConversations: number
  recentMessages: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalProperties: 0,
    availableProperties: 0,
    totalBookings: 0,
    pendingBookings: 0,
    totalConversations: 0,
    recentMessages: 0,
  })
  const [recentConversations, setRecentConversations] = useState<any[]>([])
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([])

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      const [properties, bookings, conversations] = await Promise.all([
        fetch('/api/properties').then(r => r.json()),
        fetch('/api/bookings').then(r => r.json()),
        fetch('/api/conversations').then(r => r.json()),
      ])

      setStats({
        totalProperties: properties.length,
        availableProperties: properties.filter((p: any) => p.status === 'available').length,
        totalBookings: bookings.length,
        pendingBookings: bookings.filter((b: any) => b.status === 'pending').length,
        totalConversations: conversations.length,
        recentMessages: conversations.reduce((acc: number, c: any) => acc + c.messages.length, 0),
      })

      setRecentConversations(conversations.slice(0, 5))
      setUpcomingBookings(bookings.filter((b: any) => b.status !== 'cancelled').slice(0, 5))
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-zinc-500 mt-1">Welcome to your JCKSN assistant</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatsCard
          title="Total Properties"
          value={stats.totalProperties}
          subtitle={`${stats.availableProperties} available`}
          icon={<BuildingIcon />}
        />
        <StatsCard
          title="Bookings"
          value={stats.totalBookings}
          subtitle={`${stats.pendingBookings} pending`}
          icon={<CalendarIcon />}
        />
        <StatsCard
          title="Conversations"
          value={stats.totalConversations}
          subtitle={`${stats.recentMessages} messages`}
          icon={<MessageIcon />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-[#0a0a0a] border-white/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageIcon className="w-5 h-5" />
              Recent Conversations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentConversations.length === 0 ? (
              <p className="text-zinc-500 text-sm">No conversations yet</p>
            ) : (
              <div className="space-y-3">
                {recentConversations.map((conv) => (
                  <div key={conv.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                        <span className="text-sm font-semibold">
                          {conv.name?.[0] || conv.phone.slice(-2)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{conv.name || conv.phone}</p>
                        <p className="text-xs text-zinc-500 truncate max-w-[200px]">
                          {conv.lastMessage}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-zinc-500">
                      {new Date(conv.lastActive).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a0a] border-white/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Upcoming Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length === 0 ? (
              <p className="text-zinc-500 text-sm">No upcoming bookings</p>
            ) : (
              <div className="space-y-3">
                {upcomingBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div>
                      <p className="text-sm font-medium">{booking.customerName}</p>
                      <p className="text-xs text-zinc-500">
                        {booking.property?.title} · {booking.date} at {booking.time}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      booking.status === 'pending' ? 'bg-white/10 text-zinc-300' :
                      booking.status === 'confirmed' ? 'bg-white text-black' :
                      'bg-white/5 text-zinc-500'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatsCard({ title, value, subtitle, icon }: {
  title: string
  value: number
  subtitle: string
  icon: React.ReactNode
}) {
  return (
    <Card className="bg-[#0a0a0a] border-white/5 card-hover">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-zinc-500">{title}</p>
            <p className="text-3xl font-bold mt-1 tracking-tight">{value}</p>
            <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function BuildingIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function MessageIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  )
}
