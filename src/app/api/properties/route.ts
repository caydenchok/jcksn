import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { writeFile, unlink } from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'
import { v4 as uuid } from 'uuid'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const id = searchParams.get('id')

    if (id) {
      const property = await prisma.property.findUnique({ where: { id: parseInt(id) } })
      if (!property) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json(property)
    }

    const where: any = {}

    if (type) where.propertyType = type
    if (status) where.status = status
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { location: { contains: search } },
        { description: { contains: search } },
      ]
    }

    const properties = await prisma.property.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(properties)
  } catch (error: any) {
    console.error('Properties GET error:', error)
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(request: Request) {
  const formData = await request.formData()

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const priceRaw = formData.get('price') as string
  const propertyType = formData.get('propertyType') as string
  const propertyCategory = formData.get('propertyCategory') as string
  const tenure = formData.get('tenure') as string
  const furnishing = formData.get('furnishing') as string
  const lotType = formData.get('lotType') as string
  const location = formData.get('location') as string
  const state = formData.get('state') as string
  const size = formData.get('size') as string
  const landSize = formData.get('landSize') as string
  const bedroomsRaw = formData.get('bedrooms') as string
  const bathroomsRaw = formData.get('bathrooms') as string
  const carParksRaw = formData.get('carParks') as string
  const features = formData.get('features') as string
  const status = formData.get('status') as string

  if (!title || !description || !priceRaw || !propertyType || !location || !size || !bedroomsRaw || !bathroomsRaw) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const price = parseFloat(priceRaw)
  const bedrooms = parseInt(bedroomsRaw)
  const bathrooms = parseInt(bathroomsRaw)
  const carParks = carParksRaw ? parseInt(carParksRaw) : 0

  if (isNaN(price) || isNaN(bedrooms) || isNaN(bathrooms) || price < 0 || bedrooms < 0 || bathrooms < 0) {
    return NextResponse.json({ error: 'Invalid numeric values' }, { status: 400 })
  }

  const images: string[] = []
  const imageFiles = formData.getAll('images')

  if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true })
  }

  for (const file of imageFiles) {
    if (file instanceof File) {
      const ext = file.name.split('.').pop()
      const filename = `${uuid()}.${ext}`
      const filepath = path.join(UPLOAD_DIR, filename)
      const buffer = Buffer.from(await file.arrayBuffer())
      await writeFile(filepath, buffer)
      images.push(`/uploads/${filename}`)
    }
  }

  try {
    const property = await prisma.property.create({
      data: {
        title,
        description,
        price,
        propertyType,
        propertyCategory: propertyCategory || 'residential',
        tenure: tenure || 'freehold',
        furnishing: furnishing || 'unfurnished',
        lotType: lotType || 'intermediate',
        location,
        state: state || '',
        size,
        landSize: landSize || '',
        bedrooms,
        bathrooms,
        carParks,
        features: features || '[]',
        status: status || 'available',
        images: JSON.stringify(images),
      },
    })

    return NextResponse.json(property)
  } catch (error: any) {
    console.error('Error creating property:', error)
    return NextResponse.json({ error: error.message || 'Failed to create property' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const data = await request.json()

  if (!data.id) {
    return NextResponse.json({ error: 'Missing property id' }, { status: 400 })
  }

  const updateData: any = {}
  if (data.title !== undefined) updateData.title = data.title
  if (data.description !== undefined) updateData.description = data.description
  if (data.price !== undefined) updateData.price = parseFloat(data.price)
  if (data.propertyType !== undefined) updateData.propertyType = data.propertyType
  if (data.propertyCategory !== undefined) updateData.propertyCategory = data.propertyCategory
  if (data.tenure !== undefined) updateData.tenure = data.tenure
  if (data.furnishing !== undefined) updateData.furnishing = data.furnishing
  if (data.lotType !== undefined) updateData.lotType = data.lotType
  if (data.location !== undefined) updateData.location = data.location
  if (data.state !== undefined) updateData.state = data.state
  if (data.size !== undefined) updateData.size = data.size
  if (data.landSize !== undefined) updateData.landSize = data.landSize
  if (data.bedrooms !== undefined) updateData.bedrooms = parseInt(data.bedrooms)
  if (data.bathrooms !== undefined) updateData.bathrooms = parseInt(data.bathrooms)

  try {
    const property = await prisma.property.update({
      where: { id: data.id },
      data: updateData,
    })

    return NextResponse.json(property)
  } catch (error: any) {
    console.error('Error updating property:', error)
    return NextResponse.json({ error: error.message || 'Failed to update property' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Missing property id' }, { status: 400 })
  }

  const property = await prisma.property.findUnique({ where: { id: parseInt(id) } })
  if (!property) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const images = JSON.parse(property.images || '[]')
  for (const imgPath of images) {
    const fullPath = path.join(process.cwd(), 'public', imgPath)
    if (existsSync(fullPath)) {
      await unlink(fullPath).catch(() => {})
    }
  }

  await prisma.property.delete({ where: { id: parseInt(id) } })

  return NextResponse.json({ success: true })
}
