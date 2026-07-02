import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const source = searchParams.get('source')

  const where: any = {}
  if (status) where.status = status
  if (source) where.source = source

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(leads)
}

export async function POST(request: Request) {
  const data = await request.json()

  if (Array.isArray(data)) {
    // Bulk import leads from Apify
    const results = []
    for (const lead of data) {
      const existing = lead.phone
        ? await prisma.lead.findFirst({ where: { phone: lead.phone } })
        : null

      if (!existing) {
        const created = await prisma.lead.create({
          data: {
            name: lead.name || '',
            phone: lead.phone || '',
            email: lead.email || '',
            source: lead.source || 'apify',
            message: lead.message || '',
            location: lead.location || '',
            budget: lead.budget || '',
            requirement: lead.requirement || '',
          },
        })
        results.push(created)
      }
    }
    return NextResponse.json({ imported: results.length, leads: results })
  }

  // Single lead
  const lead = await prisma.lead.create({
    data: {
      name: data.name || '',
      phone: data.phone || '',
      email: data.email || '',
      source: data.source || 'manual',
      message: data.message || '',
      location: data.location || '',
      budget: data.budget || '',
      requirement: data.requirement || '',
    },
  })

  return NextResponse.json(lead)
}

export async function PATCH(request: Request) {
  const data = await request.json()

  if (!data.id) {
    return NextResponse.json({ error: 'Missing lead id' }, { status: 400 })
  }

  const updateData: any = {}
  if (data.status !== undefined) updateData.status = data.status
  if (data.notes !== undefined) updateData.notes = data.notes
  if (data.name !== undefined) updateData.name = data.name
  if (data.phone !== undefined) updateData.phone = data.phone
  if (data.email !== undefined) updateData.email = data.email
  if (data.location !== undefined) updateData.location = data.location
  if (data.budget !== undefined) updateData.budget = data.budget
  if (data.requirement !== undefined) updateData.requirement = data.requirement
  if (data.profileUrl !== undefined) updateData.profileUrl = data.profileUrl
  if (data.nameVerified !== undefined) updateData.nameVerified = data.nameVerified

  const lead = await prisma.lead.update({
    where: { id: data.id },
    data: updateData,
  })

  return NextResponse.json(lead)
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Missing lead id' }, { status: 400 })
  }

  await prisma.lead.delete({ where: { id: parseInt(id) } })

  return NextResponse.json({ success: true })
}
