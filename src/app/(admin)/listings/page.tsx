'use client'

import { useEffect, useState, ChangeEvent } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

function ImageGallery({ images, title }: { images: string[]; title: string }) {
  const [current, setCurrent] = useState(0)

  if (images.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <svg className="w-20 h-20 text-zinc-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
        </svg>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full group/gallery">
      {images.map((src, idx) => (
        <img
          key={idx}
          src={src}
          alt={`${title} ${idx + 1}`}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            idx === current ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
        />
      ))}

      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setCurrent(prev => prev === 0 ? images.length - 1 : prev - 1) }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover/gallery:opacity-100 transition-opacity text-white hover:bg-black/80"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setCurrent(prev => prev === images.length - 1 ? 0 : prev + 1) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover/gallery:opacity-100 transition-opacity text-white hover:bg-black/80"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => { e.stopPropagation(); setCurrent(idx) }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  idx === current ? 'bg-white w-4' : 'bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
          <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-white text-xs font-medium">
            {current + 1}/{images.length}
          </div>
        </>
      )}
    </div>
  )
}

interface Property {
  id: number
  title: string
  description: string
  price: number
  propertyType: string
  propertyCategory: string
  tenure: string
  furnishing: string
  lotType: string
  status: string
  location: string
  state: string
  size: string
  landSize: string
  bedrooms: number
  bathrooms: number
  carParks: number
  features: string
  images: string
}

const PROPERTY_TYPES = [
  'Condominium', 'Apartment', 'Service Residence', 'Studio',
  'Terrace House', 'Semi-Detached', 'Bungalow', 'Townhouse',
  'Duplex', 'Penthouse', 'Flat', 'Residential Land'
]

const STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan',
  'Pahang', 'Penang', 'Perak', 'Perlis', 'Sabah', 'Sarawak',
  'Selangor', 'Kuala Lumpur', 'Putrajaya', 'Labuan'
]

const FURNISHING_OPTIONS = ['Unfurnished', 'Partially Furnished', 'Fully Furnished']
const TENURE_OPTIONS = ['Freehold', 'Leasehold']
const LOT_OPTIONS = ['Intermediate', 'Corner', 'End Lot', 'Double Storey', 'Single Storey', 'Custom']
const CATEGORY_OPTIONS = ['Residential', 'Commercial', 'Industrial']

export default function ListingsPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProperty, setEditingProperty] = useState<Property | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    propertyType: 'Condominium',
    propertyCategory: 'Residential',
    tenure: 'Freehold',
    furnishing: 'Unfurnished',
    lotType: 'Intermediate',
    customLotType: '',
    location: '',
    state: 'Kuala Lumpur',
    size: '',
    landSize: '',
    bedrooms: '3',
    bathrooms: '2',
    carParks: '1',
    features: '',
    status: 'available',
  })
  const [imageFiles, setImageFiles] = useState<FileList | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    fetchProperties()
  }, [debouncedSearch, filterType])

  async function fetchProperties() {
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (filterType !== 'all') params.set('type', filterType)

    const res = await fetch(`/api/properties?${params}`)
    const data = await res.json()
    setProperties(data)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      const lotTypeToSend = formData.lotType === 'Custom' ? formData.customLotType : formData.lotType

      if (editingProperty) {
        const res = await fetch('/api/properties', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingProperty.id,
            ...formData,
            lotType: lotTypeToSend,
            bedrooms: parseInt(formData.bedrooms),
            bathrooms: parseInt(formData.bathrooms),
            carParks: parseInt(formData.carParks),
          }),
        })
        if (!res.ok) {
          const err = await res.text()
          alert('Failed to update property: ' + err)
          return
        }
      } else {
        const formDataToSend = new FormData()
        Object.entries(formData).forEach(([key, value]) => {
          if (key === 'lotType') {
            formDataToSend.append(key, lotTypeToSend)
          } else if (key !== 'customLotType') {
            formDataToSend.append(key, value)
          }
        })

        if (imageFiles) {
          for (const file of Array.from(imageFiles)) {
            formDataToSend.append('images', file)
          }
        }

        const res = await fetch('/api/properties', {
          method: 'POST',
          body: formDataToSend,
        })

        if (!res.ok) {
          const err = await res.text()
          alert('Failed to add property: ' + err)
          return
        }
      }

      setIsDialogOpen(false)
      setEditingProperty(null)
      resetForm()
      fetchProperties()
    } catch (err) {
      console.error('Error saving property:', err)
      alert('Error saving property. Check console for details.')
    }
  }

  function resetForm() {
    setFormData({
      title: '',
      description: '',
      price: '',
      propertyType: 'Condominium',
      propertyCategory: 'Residential',
      tenure: 'Freehold',
      furnishing: 'Unfurnished',
      lotType: 'Intermediate',
      customLotType: '',
      location: '',
      state: 'Kuala Lumpur',
      size: '',
      landSize: '',
      bedrooms: '3',
      bathrooms: '2',
      carParks: '1',
      features: '',
      status: 'available',
    })
    setImageFiles(null)
  }

  function openEdit(property: Property) {
    setEditingProperty(property)
    const isCustomLot = !LOT_OPTIONS.slice(0, -1).includes(property.lotType)
    setFormData({
      title: property.title,
      description: property.description,
      price: property.price.toString(),
      propertyType: property.propertyType,
      propertyCategory: property.propertyCategory || 'Residential',
      tenure: property.tenure || 'Freehold',
      furnishing: property.furnishing || 'Unfurnished',
      lotType: isCustomLot ? 'Custom' : (property.lotType || 'Intermediate'),
      customLotType: isCustomLot ? property.lotType : '',
      location: property.location,
      state: property.state || 'Kuala Lumpur',
      size: property.size,
      landSize: property.landSize || '',
      bedrooms: property.bedrooms.toString(),
      bathrooms: property.bathrooms.toString(),
      carParks: (property.carParks || 0).toString(),
      features: property.features,
      status: property.status,
    })
    setImageFiles(null)
    setIsDialogOpen(true)
  }

  function openCreate() {
    setEditingProperty(null)
    resetForm()
    setIsDialogOpen(true)
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this property?')) return
    await fetch(`/api/properties?id=${id}`, { method: 'DELETE' })
    fetchProperties()
  }

  function parseImages(imagesJson: string): string[] {
    try {
      return JSON.parse(imagesJson || '[]')
    } catch {
      return []
    }
  }

  const availableCount = properties.filter(p => p.status === 'available').length

  return (
    <div className="min-h-screen bg-[#080808]">
      <div className="px-12 pt-10 pb-0">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h1 className="text-5xl font-bold tracking-tight text-white">Listings</h1>
            <p className="text-zinc-500 mt-2 text-base">Manage your property portfolio</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger render={<button className="inline-flex items-center gap-2.5 bg-white hover:bg-zinc-200 text-black font-semibold px-6 py-3 rounded-xl text-base transition-all duration-150 active:scale-[0.97]" onClick={openCreate} />}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Property
            </DialogTrigger>
            <DialogContent className="bg-[#0a0a0a] border-white/10 w-[95vw] max-w-[1600px] max-h-[90vh] overflow-y-auto p-6">
              <DialogHeader>
                <DialogTitle className="text-xl">{editingProperty ? 'Edit Property' : 'Add New Property'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-5 mt-4">
                <div>
                  <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Property Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Luxury Condo in KLCC with Pool View"
                    className="bg-white/5 border-white/10 mt-1.5 h-11"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                  <div>
                    <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Property Type *</Label>
                    <Select value={formData.propertyType} onValueChange={(v) => setFormData({ ...formData, propertyType: v || 'Condominium' })}>
                      <SelectTrigger className="bg-white/5 border-white/10 mt-1.5 h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111] border-white/10">
                        {PROPERTY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Category</Label>
                    <Select value={formData.propertyCategory} onValueChange={(v) => setFormData({ ...formData, propertyCategory: v || 'Residential' })}>
                      <SelectTrigger className="bg-white/5 border-white/10 mt-1.5 h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111] border-white/10">
                        {CATEGORY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Tenure</Label>
                    <Select value={formData.tenure} onValueChange={(v) => setFormData({ ...formData, tenure: v || 'Freehold' })}>
                      <SelectTrigger className="bg-white/5 border-white/10 mt-1.5 h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111] border-white/10">
                        {TENURE_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Location *</Label>
                    <Input
                      value={formData.location}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g. Mont Kiara, KLCC, Bangsar"
                      className="bg-white/5 border-white/10 mt-1.5 h-11"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">State</Label>
                    <Select value={formData.state} onValueChange={(v) => setFormData({ ...formData, state: v || 'Kuala Lumpur' })}>
                      <SelectTrigger className="bg-white/5 border-white/10 mt-1.5 h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111] border-white/10">
                        {STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Description *</Label>
                  <textarea
                    value={formData.description}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the property features, nearby amenities, transport links..."
                    className="w-full h-28 px-4 py-3 mt-1.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
                  <div>
                    <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Price (RM) *</Label>
                    <Input
                      type="number"
                      value={formData.price}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="500000"
                      className="bg-white/5 border-white/10 mt-1.5 h-11"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Built-up (sqft) *</Label>
                    <Input
                      value={formData.size}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, size: e.target.value })}
                      placeholder="1200"
                      className="bg-white/5 border-white/10 mt-1.5 h-11"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Land Size (sqft)</Label>
                    <Input
                      value={formData.landSize}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, landSize: e.target.value })}
                      placeholder="2000"
                      className="bg-white/5 border-white/10 mt-1.5 h-11"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Car Parks</Label>
                    <Input
                      type="number"
                      value={formData.carParks}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, carParks: e.target.value })}
                      className="bg-white/5 border-white/10 mt-1.5 h-11"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-5">
                  <div>
                    <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Bedrooms *</Label>
                    <Input
                      type="number"
                      value={formData.bedrooms}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, bedrooms: e.target.value })}
                      className="bg-white/5 border-white/10 mt-1.5 h-11"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Bathrooms *</Label>
                    <Input
                      type="number"
                      value={formData.bathrooms}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, bathrooms: e.target.value })}
                      className="bg-white/5 border-white/10 mt-1.5 h-11"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Furnishing</Label>
                    <Select value={formData.furnishing} onValueChange={(v) => setFormData({ ...formData, furnishing: v || 'Unfurnished' })}>
                      <SelectTrigger className="bg-white/5 border-white/10 mt-1.5 h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111] border-white/10">
                        {FURNISHING_OPTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Lot Type</Label>
                    {formData.lotType === 'Custom' ? (
                      <Input
                        value={formData.customLotType}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, customLotType: e.target.value })}
                        placeholder="Enter custom lot type"
                        className="bg-white/5 border-white/10 mt-1.5 h-11"
                        autoFocus
                      />
                    ) : (
                      <Select value={formData.lotType} onValueChange={(v) => setFormData({ ...formData, lotType: v || 'Intermediate' })}>
                        <SelectTrigger className="bg-white/5 border-white/10 mt-1.5 h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#111] border-white/10">
                          {LOT_OPTIONS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v || 'available' })}>
                      <SelectTrigger className="bg-white/5 border-white/10 mt-1.5 h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111] border-white/10">
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="sold">Sold</SelectItem>
                        <SelectItem value="rented">Rented</SelectItem>
                        <SelectItem value="reserved">Reserved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Images</Label>
                  <div className="mt-1.5">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const files = e.target.files
                        if (files && files.length > 0) {
                          setImageFiles(files)
                        }
                      }}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-dashed border-white/10 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-white file:text-black file:font-medium file:text-sm file:cursor-pointer hover:file:bg-zinc-200 transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="flex-1 h-11">
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 bg-white hover:bg-zinc-200 text-black font-semibold h-11 rounded-xl transition-all duration-150 active:scale-[0.97]">
                    {editingProperty ? 'Update Property' : 'Add Property'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <div className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-white/5 border border-white/5">
            <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <Input
              placeholder="Search by title, location..."
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="border-0 bg-transparent p-0 h-auto text-base focus-visible:ring-0 w-72"
            />
          </div>
          <Select value={filterType} onValueChange={(v) => setFilterType(v || 'all')}>
            <SelectTrigger className="w-[160px] h-12 bg-white/5 border-white/5 rounded-xl text-sm">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent className="bg-[#111] border-white/10">
              <SelectItem value="all">All Types</SelectItem>
              {PROPERTY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex-1" />
          <div className="flex items-center gap-5 text-sm text-zinc-500">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {availableCount} available
            </span>
            <span>{properties.length} total</span>
          </div>
        </div>
      </div>

      <div className="px-12 pb-12">
        {properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-24 h-24 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
              <svg className="w-12 h-12 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No properties yet</h3>
            <p className="text-sm text-zinc-500 max-w-sm mb-6">Start building your portfolio by adding your first property listing.</p>
            <Button onClick={openCreate} className="bg-white text-black hover:bg-zinc-200 font-semibold h-11 px-8 rounded-xl text-base">
              Add First Property
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {properties.map((property, i) => {
              const images = parseImages(property.images)
              const psf = property.size ? Math.round(property.price / parseInt(property.size)) : 0
              return (
                <div
                  key={property.id}
                  className="group relative bg-[#0c0c0c] rounded-2xl border border-white/[0.04] overflow-hidden transition-all duration-200 hover:border-white/[0.08] hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="relative h-64 bg-[#111] overflow-hidden">
                    <ImageGallery images={images} title={property.title} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />
                    <div className="absolute top-4 left-4 flex gap-2">
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        property.tenure === 'Freehold'
                          ? 'bg-emerald-500/90 text-white'
                          : 'bg-blue-500/90 text-white'
                      }`}>
                        {property.tenure}
                      </span>
                      <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/20 text-white backdrop-blur-sm">
                        {property.propertyType}
                      </span>
                    </div>
                    <div className="absolute top-4 right-4">
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-sm ${
                        property.status === 'available'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                          : property.status === 'sold'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/20'
                          : property.status === 'rented'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20'
                          : 'bg-white/10 text-zinc-300 border border-white/10'
                      }`}>
                        {property.status}
                      </span>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="text-3xl font-bold text-white tracking-tight">
                        RM {property.price.toLocaleString()}
                      </p>
                      {psf > 0 && (
                        <p className="text-sm text-white/60 mt-0.5">RM {psf.toLocaleString()} psf</p>
                      )}
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="text-base font-semibold text-white mb-1.5 line-clamp-2 leading-snug">{property.title}</h3>
                    <div className="flex items-center gap-1.5 text-zinc-500 text-sm mb-4">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                      <span className="truncate">{property.location}{property.state ? `, ${property.state}` : ''}</span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-zinc-400 mb-4">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                        </svg>
                        <span>{property.bedrooms} bed</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{property.bathrooms} bath</span>
                      </div>
                      {property.carParks > 0 && (
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                          </svg>
                          <span>{property.carParks} car</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mb-4">
                      <span className="px-2 py-1 rounded-md bg-white/5 text-zinc-500 text-xs">{property.furnishing}</span>
                      <span className="px-2 py-1 rounded-md bg-white/5 text-zinc-500 text-xs">{property.size} sqft</span>
                      {property.landSize && (
                        <span className="px-2 py-1 rounded-md bg-white/5 text-zinc-500 text-xs">{property.landSize} sqft land</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                      <button
                        onClick={() => openEdit(property)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-xl bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white transition-all duration-150"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(property.id)}
                        className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-xl text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
