'use client'

import { useEffect, useState, ReactNode } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { BRAND } from '@/lib/brand'

interface Property {
  id: number
  title: string
  description: string
  price: number
  propertyType: string
  propertyCategory: string
  purpose: string
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

interface AgentProfile {
  name: string
  phone: string
  email: string
  company: string
  licenseNo: string
  tagline: string
  bio: string
  languages: string
  specialities: string
  profilePic: string
}

const GOLD = '#E2A93B'
const GOLDT = '#8A6512'
const fontDisplay = { fontFamily: 'var(--font-display, Georgia, serif)' }
const fontBody = { fontFamily: 'var(--font-body, system-ui, sans-serif)' }
const EASE = 'cubic-bezier(0.16,1,0.3,1)'
const glass = 'bg-white/40 backdrop-blur-xl border border-white/60 shadow-[0_10px_50px_-15px_rgba(80,60,15,0.28)]'

const Icons = {
  wa: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
  bed: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/></svg>,
  bath: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  size: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"/></svg>,
  car: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"/></svg>,
  land: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"/></svg>,
  location: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/></svg>,
  chevronLeft: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>,
  chevronRight: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>,
  back: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/></svg>,
  check: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>,
  desc: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>,
  details: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"/></svg>,
  sparkle: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>,
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-neutral-200/70 last:border-0">
      <span className="text-sm text-neutral-500">{label}</span>
      <span className="text-sm font-medium text-neutral-900 text-right">{value}</span>
    </div>
  )
}

function Stat({ icon, value, label }: { icon: ReactNode; value: ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center text-center py-4 px-2 rounded-2xl bg-white/50 border border-white/60">
      <span className="mb-2" style={{ color: GOLDT }}>{icon}</span>
      <span className="text-lg font-bold text-neutral-900 leading-none">{value}</span>
      <span className="text-[10px] text-neutral-400 uppercase tracking-wider mt-1.5">{label}</span>
    </div>
  )
}

export default function PropertyDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [property, setProperty] = useState<Property | null>(null)
  const [agent, setAgent] = useState<AgentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [cur, setCur] = useState(0)

  useEffect(() => {
    if (!id) return
    let alive = true
    Promise.all([
      fetch(`/api/properties?id=${id}`).then(r => (r.ok ? r.json() : Promise.reject())),
      fetch('/api/agent').then(r => r.json()).catch(() => null),
    ])
      .then(([prop, agentData]) => {
        if (!alive) return
        if (!prop || prop.error) { setNotFound(true); setLoading(false); return }
        setProperty(prop)
        setAgent(agentData)
        setLoading(false)
      })
      .catch(() => { if (alive) { setNotFound(true); setLoading(false) } })
    return () => { alive = false }
  }, [id])

  const agentName = agent?.name || BRAND.agent
  const ren = agent?.licenseNo || BRAND.ren
  const email = agent?.email || BRAND.email
  const company = agent?.company || BRAND.company
  const profilePic = agent?.profilePic || ''
  const ph = agent?.phone?.replace(/[^0-9]/g, '') || BRAND.phone

  const imgs: string[] = (() => { try { return JSON.parse(property?.images || '[]') } catch { return [] } })()
  const features: string[] = (() => { try { return JSON.parse(property?.features || '[]') } catch { return [] } })()
  const psf = property?.size ? Math.round(property.price / parseInt(property.size)) : 0

  const waMsg = property
    ? `Hi ${agentName}! I'm interested in "${property.title}" at ${property.location}${property.state ? `, ${property.state}` : ''} (RM ${property.price.toLocaleString()}). Could you tell me more?`
    : `Hi ${agentName}! I'd like to know more about a property.`
  const waHref = `https://wa.me/${ph}?text=${encodeURIComponent(waMsg)}`

  return (
    <div className="relative min-h-dvh text-neutral-900 antialiased selection:bg-[#E2A93B] selection:text-black" style={fontBody}>
      {/* Background */}
      <div className="fixed inset-0 -z-20 bg-[#FAF7F0]" />
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[5%] w-[55vw] h-[55vw] rounded-full blur-[120px] opacity-50" style={{ background: 'radial-gradient(circle, #F3D58C, transparent 70%)' }} />
        <div className="absolute bottom-[-15%] right-[-10%] w-[50vw] h-[50vw] rounded-full blur-[120px] opacity-40" style={{ background: 'radial-gradient(circle, #EAD9BC, transparent 70%)' }} />
      </div>

      {/* Top nav */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#FAF7F0]/70 border-b border-white/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/p" className="flex items-baseline gap-2">
            <span className="text-xl font-bold tracking-[0.2em] text-neutral-900" style={fontDisplay}>ZERO<span style={{ color: GOLD }}>88</span></span>
            <span className="hidden sm:inline text-[10px] tracking-[0.3em] text-neutral-400 uppercase">Property</span>
          </Link>
          <a href={waHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold px-4 sm:px-5 py-2.5 rounded-full bg-[#25D366] hover:bg-[#1ebe5a] text-white transition-all active:scale-95 shadow-[0_4px_15px_-3px_rgba(37,211,102,0.5)]">
            {Icons.wa}<span className="hidden sm:inline">WhatsApp</span>
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Link href="/p#listings" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 transition-colors mb-5">
          {Icons.back} Back to listings
        </Link>

        {loading ? (
          <div className="animate-pulse space-y-6">
            <div className={`h-72 sm:h-[26rem] rounded-3xl ${glass}`} />
            <div className="h-8 w-2/3 bg-white/50 rounded-full" />
            <div className="h-5 w-1/3 bg-white/50 rounded-full" />
          </div>
        ) : notFound || !property ? (
          <div className={`text-center py-24 rounded-3xl ${glass}`}>
            <h1 className="text-2xl font-semibold text-neutral-800" style={fontDisplay}>Property not found</h1>
            <p className="text-neutral-500 text-sm mt-2">This listing may have been removed or is no longer available.</p>
            <Link href="/p#listings" className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-full text-sm font-semibold text-black" style={{ background: GOLD }}>
              Browse all listings
            </Link>
          </div>
        ) : (
          <>
            {/* Gallery */}
            <div className="relative h-72 sm:h-[26rem] lg:h-[32rem] rounded-3xl overflow-hidden bg-neutral-100 border border-white/60 shadow-[0_20px_60px_-20px_rgba(80,60,15,0.35)]">
              {imgs.length ? (
                <>
                  {imgs.map((s, i) => (
                    <img key={i} src={s} alt={`${property.title} — photo ${i + 1}`} className={`absolute inset-0 w-full h-full object-cover transition-all duration-[900ms] ${i === cur ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`} style={{ transitionTimingFunction: EASE }} />
                  ))}
                  <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                    <span className={`px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide ${property.tenure === 'Freehold' ? 'text-black' : 'bg-black/40 text-white backdrop-blur-md border border-white/20'}`} style={property.tenure === 'Freehold' ? { background: GOLD } : undefined}>{property.tenure}</span>
                    <span className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-white/85 text-neutral-800 backdrop-blur-md">{property.propertyType}</span>
                    {property.purpose && <span className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-black/40 text-white backdrop-blur-md border border-white/20">For <span className="capitalize">{property.purpose}</span></span>}
                  </div>
                  {imgs.length > 1 && (
                    <>
                      <button aria-label="Previous photo" onClick={() => setCur(v => v === 0 ? imgs.length - 1 : v - 1)} className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/70 backdrop-blur-md flex items-center justify-center text-neutral-800 hover:bg-white transition-all border border-white/60 shadow-md">{Icons.chevronLeft}</button>
                      <button aria-label="Next photo" onClick={() => setCur(v => v === imgs.length - 1 ? 0 : v + 1)} className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/70 backdrop-blur-md flex items-center justify-center text-neutral-800 hover:bg-white transition-all border border-white/60 shadow-md">{Icons.chevronRight}</button>
                      <div className="absolute bottom-4 right-4 text-white/90 text-sm font-medium bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">{cur + 1} / {imgs.length}</div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200">
                  <svg className="w-24 h-24 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" /></svg>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {imgs.length > 1 && (
              <div className="flex gap-2.5 mt-4 overflow-x-auto pb-1 -mx-1 px-1">
                {imgs.map((s, i) => (
                  <button key={i} onClick={() => setCur(i)} className={`relative flex-shrink-0 w-20 h-16 sm:w-24 sm:h-18 rounded-xl overflow-hidden border-2 transition-all ${i === cur ? 'border-[#E2A93B]' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                    <img src={s} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Content grid */}
            <div className="grid lg:grid-cols-[1fr_360px] gap-6 lg:gap-8 mt-8">
              {/* Left — details */}
              <div className="min-w-0">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 leading-tight" style={fontDisplay}>{property.title}</h1>
                    <div className="flex items-center gap-1.5 text-neutral-500 mt-2">{Icons.location}<span>{property.location}{property.state ? `, ${property.state}` : ''}</span></div>
                  </div>
                  <div className="flex-shrink-0 sm:text-right">
                    <p className="text-3xl sm:text-4xl font-bold whitespace-nowrap" style={{ ...fontDisplay, color: GOLDT }}>RM {property.price.toLocaleString()}</p>
                    {psf > 0 && <p className="text-sm text-neutral-500 mt-1">RM {psf.toLocaleString()} psf</p>}
                  </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 mt-7">
                  <Stat icon={Icons.bed} value={property.bedrooms} label="Beds" />
                  <Stat icon={Icons.bath} value={property.bathrooms} label="Baths" />
                  <Stat icon={Icons.size} value={property.size} label="Built (sqft)" />
                  {property.landSize && <Stat icon={Icons.land} value={property.landSize} label="Land (sqft)" />}
                  <Stat icon={Icons.car} value={property.carParks} label="Parking" />
                </div>

                {/* Description */}
                {property.description && (
                  <section className="mt-9">
                    <div className="flex items-center gap-2.5 mb-4">
                      <span style={{ color: GOLDT }}>{Icons.desc}</span>
                      <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-[0.15em]">Description</h2>
                    </div>
                    <p className="text-neutral-700 leading-relaxed whitespace-pre-wrap text-[15px]">{property.description}</p>
                  </section>
                )}

                {/* Property details */}
                <section className="mt-9">
                  <div className="flex items-center gap-2.5 mb-4">
                    <span style={{ color: GOLDT }}>{Icons.details}</span>
                    <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-[0.15em]">Property Details</h2>
                  </div>
                  <div className={`rounded-2xl px-5 sm:px-6 py-2 ${glass}`}>
                    <div className="grid sm:grid-cols-2 sm:gap-x-10">
                      <DetailRow label="Property Type" value={property.propertyType} />
                      <DetailRow label="Category" value={<span className="capitalize">{property.propertyCategory}</span>} />
                      {property.purpose && <DetailRow label="Purpose" value={<span>For <span className="capitalize">{property.purpose}</span></span>} />}
                      <DetailRow label="Tenure" value={property.tenure} />
                      <DetailRow label="Furnishing" value={property.furnishing} />
                      <DetailRow label="Lot Type" value={property.lotType} />
                      <DetailRow label="Built-up Size" value={`${property.size} sqft`} />
                      {property.landSize && <DetailRow label="Land Size" value={`${property.landSize} sqft`} />}
                      {property.state && <DetailRow label="State" value={property.state} />}
                      <DetailRow label="Status" value={<span className="capitalize">{property.status}</span>} />
                    </div>
                  </div>
                </section>

                {/* Features */}
                {features.length > 0 && (
                  <section className="mt-9">
                    <div className="flex items-center gap-2.5 mb-4">
                      <span style={{ color: GOLDT }}>{Icons.sparkle}</span>
                      <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-[0.15em]">Features & Amenities</h2>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      {features.map((f, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E2A93B]/10 text-[#8A6512] text-sm font-medium border border-[#E2A93B]/20">
                          <span className="text-[#8A6512]">{Icons.check}</span>{f}
                        </span>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {/* Right — sticky agent / CTA */}
              <aside className="lg:sticky lg:top-24 h-fit">
                <div className={`rounded-3xl p-6 ${glass}`}>
                  <div className="flex items-center gap-4">
                    {profilePic
                      ? <img src={profilePic} alt={agentName} className="w-16 h-16 rounded-2xl object-cover" />
                      : <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-black text-2xl font-bold" style={{ background: GOLD, ...fontDisplay }}>{agentName[0]?.toUpperCase()}</div>}
                    <div className="min-w-0">
                      <p className="font-semibold text-neutral-900 truncate" style={fontDisplay}>{agentName}</p>
                      <p className="text-sm" style={{ color: GOLDT }}>{BRAND.jobTitle} · {ren}</p>
                      <p className="text-xs text-neutral-500 truncate mt-0.5">{company}</p>
                    </div>
                  </div>

                  <div className="mt-5 pt-5 border-t border-white/60">
                    <p className="text-[11px] text-neutral-400 uppercase tracking-[0.2em]">Asking price</p>
                    <p className="text-2xl font-bold mt-1" style={{ ...fontDisplay, color: GOLDT }}>RM {property.price.toLocaleString()}</p>
                    {psf > 0 && <p className="text-xs text-neutral-500">RM {psf.toLocaleString()} psf</p>}
                  </div>

                  <a href={waHref} target="_blank" rel="noopener noreferrer" className="mt-5 flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl bg-[#25D366] hover:bg-[#1ebe5a] text-white font-semibold transition-all active:scale-[0.98] shadow-[0_8px_30px_-5px_rgba(37,211,102,0.55)]">
                    {Icons.wa} Enquire on WhatsApp
                  </a>
                  <a href={`mailto:${email}?subject=${encodeURIComponent(`Enquiry: ${property.title}`)}`} className="mt-3 flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-white/60 hover:bg-white/80 text-neutral-800 font-semibold transition-all border border-white/60">
                    Email agent
                  </a>
                  <p className="text-[11px] text-neutral-400 text-center mt-4">Free consultation · No obligation</p>
                </div>
              </aside>
            </div>
          </>
        )}
      </main>

      <footer className="relative border-t border-white/50 bg-white/20 backdrop-blur-sm mt-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-400">
          <p>© {new Date().getFullYear()} {company}. All rights reserved.</p>
          <Link href="/p" className="hover:text-[#8A6512] transition-colors">← Back to {BRAND.company}</Link>
        </div>
      </footer>
    </div>
  )
}
