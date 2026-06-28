'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Booking {
  id: number
  customerName: string
  customerPhone: string
  propertyId: number
  property: {
    title: string
    location: string
  }
  bookingType: string
  date: string
  time: string
  status: string
  notes: string | null
  createdAt: string
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    fetchBookings()
  }, [filterStatus])

  async function fetchBookings() {
    const params = new URLSearchParams()
    if (filterStatus !== 'all') params.set('status', filterStatus)

    const res = await fetch(`/api/bookings?${params}`)
    const data = await res.json()
    setBookings(data)
  }

  async function updateBookingStatus(id: number, status: string) {
    await fetch('/api/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    fetchBookings()
  }

  async function deleteBooking(id: number) {
    if (!confirm('Delete this booking?')) return
    await fetch(`/api/bookings?id=${id}`, { method: 'DELETE' })
    fetchBookings()
  }

  const pendingBookings = bookings.filter(b => b.status === 'pending')
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed')
  const completedBookings = bookings.filter(b => b.status === 'completed')

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
          <p className="text-zinc-500 mt-1">Manage viewing appointments and callbacks</p>
        </div>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v || 'all')}>
          <SelectTrigger className="w-[180px] bg-white/5 border-white/10">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="bg-[#111] border-white/10">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-[#0a0a0a] border-white/5">
          <CardContent className="p-6">
            <p className="text-sm text-zinc-500">Pending</p>
            <p className="text-3xl font-bold mt-1">{pendingBookings.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#0a0a0a] border-white/5">
          <CardContent className="p-6">
            <p className="text-sm text-zinc-500">Confirmed</p>
            <p className="text-3xl font-bold mt-1">{confirmedBookings.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#0a0a0a] border-white/5">
          <CardContent className="p-6">
            <p className="text-sm text-zinc-500">Completed</p>
            <p className="text-3xl font-bold mt-1">{completedBookings.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#0a0a0a] border-white/5">
        <CardHeader>
          <CardTitle className="text-lg">All Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="text-zinc-500 text-center py-8">No bookings found</p>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-white/5 card-hover"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                      {booking.bookingType === 'viewing' ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{booking.customerName}</p>
                      <p className="text-sm text-zinc-500">
                        {booking.property?.title} · {booking.property?.location}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-medium">{booking.date}</p>
                      <p className="text-xs text-zinc-500">{booking.time}</p>
                    </div>

                    <span className={`px-3 py-1 rounded text-xs font-medium ${
                      booking.status === 'pending' ? 'bg-white/10 text-zinc-300' :
                      booking.status === 'confirmed' ? 'bg-white text-black' :
                      booking.status === 'completed' ? 'bg-white/5 text-zinc-400' :
                      'bg-white/5 text-zinc-500'
                    }`}>
                      {booking.status}
                    </span>

                    <div className="flex gap-2">
                      {booking.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                            className="bg-white text-black hover:bg-zinc-200"
                          >
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                            className="bg-white/5 text-zinc-400 hover:bg-white/10"
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                      {booking.status === 'confirmed' && (
                        <Button
                          size="sm"
                          onClick={() => updateBookingStatus(booking.id, 'completed')}
                          className="bg-white text-black hover:bg-zinc-200"
                        >
                          Complete
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => deleteBooking(booking.id)}
                        className="bg-white/5 text-zinc-500 hover:bg-white/10 hover:text-red-400"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
