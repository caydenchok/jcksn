import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const profile = await prisma.agentProfile.findFirst()
    return NextResponse.json(profile || null)
  } catch (error: any) {
    console.error('Agent GET error:', error)
    return NextResponse.json(null, { status: 200 })
  }
}

export async function POST(request: Request) {
  const data = await request.json()

  const existing = await prisma.agentProfile.findFirst()

  if (existing) {
    const profile = await prisma.agentProfile.update({
      where: { id: existing.id },
      data: {
        name: data.name || existing.name,
        phone: data.phone || existing.phone,
        email: data.email ?? existing.email,
        company: data.company ?? existing.company,
        licenseNo: data.licenseNo ?? existing.licenseNo,
        tagline: data.tagline ?? existing.tagline,
        bio: data.bio ?? existing.bio,
        welcomeMsg: data.welcomeMsg ?? existing.welcomeMsg,
        languages: data.languages ?? existing.languages,
        specialities: data.specialities ?? existing.specialities,
        profilePic: data.profilePic ?? existing.profilePic,
      },
    })
    return NextResponse.json(profile)
  }

  const profile = await prisma.agentProfile.create({
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email || '',
      company: data.company || '',
      licenseNo: data.licenseNo || '',
      tagline: data.tagline || 'Your trusted property agent',
      bio: data.bio || '',
      welcomeMsg: data.welcomeMsg || '',
      languages: data.languages || 'English, Malay',
      specialities: data.specialities || 'Residential, Commercial',
      profilePic: data.profilePic || '',
    },
  })

  return NextResponse.json(profile)
}
