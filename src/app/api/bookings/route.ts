import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  const where: any = {}
  if (status) where.status = status

  const bookings = await prisma.booking.findMany({
    where,
    include: { property: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(bookings)
}

export async function POST(request: Request) {
  const data = await request.json()

  const booking = await prisma.booking.create({
    data: {
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      propertyId: data.propertyId,
      bookingType: data.bookingType,
      date: data.date,
      time: data.time,
      notes: data.notes,
    },
    include: { property: true },
  })

  return NextResponse.json(booking)
}

export async function PATCH(request: Request) {
  const data = await request.json()

  const booking = await prisma.booking.update({
    where: { id: data.id },
    data: { status: data.status },
    include: { property: true },
  })

  return NextResponse.json(booking)
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Missing booking id' }, { status: 400 })
  }

  await prisma.booking.delete({ where: { id: parseInt(id) } })

  return NextResponse.json({ success: true })
}
