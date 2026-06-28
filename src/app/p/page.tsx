'use client'

import { useEffect, useState, ChangeEvent } from 'react'

interface Property {
  id: number
  title: string
  description: string
  price: number
  propertyType: string
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
  company: string
  tagline: string
  bio: string
  specialities: string
  profilePic: string
}

const WA = (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
)

function Gallery({ images, title }: { images: string[]; title: string }) {
  const [cur, setCur] = useState(0)
  if (!images.length) return <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200"><svg className="w-16 h-16 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.75}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" /></svg></div>
  return (
    <div className="relative w-full h-full group/g">
      {images.map((s, i) => <img key={i} src={s} alt={`${title} ${i+1}`} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${i===cur?'opacity-100':'opacity-0'}`} loading="lazy" />)}
      {images.length > 1 && (<>
        <button onClick={(e)=>{e.stopPropagation();setCur(p=>p===0?images.length-1:p-1)}} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center opacity-0 group-hover/g:opacity-100 transition-opacity text-white hover:bg-black/60"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg></button>
        <button onClick={(e)=>{e.stopPropagation();setCur(p=>p===images.length-1?0:p+1)}} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center opacity-0 group-hover/g:opacity-100 transition-opacity text-white hover:bg-black/60"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg></button>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">{images.map((_,i)=><button key={i} onClick={(e)=>{e.stopPropagation();setCur(i)}} className={`h-1.5 rounded-full transition-all ${i===cur?'bg-white w-5':'bg-white/40 w-1.5 hover:bg-white/60'}`} />)}</div>
        <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md text-white text-[10px] font-medium">{cur+1}/{images.length}</div>
      </>)}
    </div>
  )
}

function DetailModal({ p, phone, onClose }: { p: Property; phone: string; onClose: () => void }) {
  const imgs = (()=>{try{return JSON.parse(p.images||'[]')}catch{return []}})()
  const [cur,setCur]=useState(0)
  const psf = p.size ? Math.round(p.price / parseInt(p.size)) : 0
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/10 flex items-center justify-center text-zinc-500 hover:bg-black/20"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
        <div className="relative h-72 sm:h-96 bg-zinc-100 overflow-hidden rounded-t-3xl">
          {imgs.length ? (<>
            {imgs.map((s:string,i:number)=><img key={i} src={s} alt="" className={`absolute inset-0 w-full h-full object-cover transition-opacity ${i===cur?'opacity-100':'opacity-0'}`} />)}
            {imgs.length>1&&(<>
              <button onClick={()=>setCur(v=>v===0?imgs.length-1:v-1)} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-white"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg></button>
              <button onClick={()=>setCur(v=>v===imgs.length-1?0:v+1)} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-white"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg></button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">{imgs.map((_:string,i:number)=><button key={i} onClick={()=>setCur(i)} className={`h-2 rounded-full transition-all ${i===cur?'bg-white w-6':'bg-white/40 w-2'}`} />)}</div>
            </>)}
            <div className="absolute top-4 left-4 flex gap-2">
              <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${p.tenure==='Freehold'?'bg-zinc-900 text-white':'bg-zinc-600 text-white'}`}>{p.tenure}</span>
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/90 text-zinc-800 backdrop-blur-sm">{p.propertyType}</span>
            </div>
          </>) : <div className="w-full h-full flex items-center justify-center"><svg className="w-20 h-20 text-zinc-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.75}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" /></svg></div>}
        </div>
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div><h2 className="text-2xl font-bold text-zinc-900 mb-1">{p.title}</h2><div className="flex items-center gap-2 text-zinc-500 text-sm"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>{p.location}{p.state?`, ${p.state}`:''}</div></div>
            <div className="text-right flex-shrink-0"><p className="text-3xl font-bold text-zinc-900">RM {p.price.toLocaleString()}</p>{psf>0&&<p className="text-sm text-zinc-500">RM {psf.toLocaleString()} psf</p>}</div>
          </div>
          <p className="text-zinc-600 text-sm leading-relaxed mb-6">{p.description}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[{v:p.bedrooms,l:'Bedrooms'},{v:p.bathrooms,l:'Bathrooms'},{v:p.carParks,l:'Car Parks'},{v:`${p.size} sqft`,l:'Built-up'}].map((x,i)=><div key={i} className="bg-zinc-50 rounded-xl p-4 text-center border border-zinc-100"><p className="text-2xl font-bold text-zinc-900">{x.v}</p><p className="text-xs text-zinc-500 mt-1">{x.l}</p></div>)}
          </div>
          <div className="flex flex-wrap gap-2 mb-6">
            {[p.furnishing, p.lotType, p.landSize&&`${p.landSize} sqft land`].filter(Boolean).map((t,i)=><span key={i} className="px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-600 text-xs font-medium">{t}</span>)}
          </div>
          {phone&&<a href={`https://wa.me/${phone}?text=${encodeURIComponent(`Hi! I'm interested in "${p.title}" at ${p.location}.`)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold transition-all active:scale-[0.98]">{WA} Inquire via WhatsApp</a>}
        </div>
      </div>
    </div>
  )
}

export default function PublicListingsPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [agent, setAgent] = useState<AgentProfile | null>(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Property | null>(null)
  const [sortBy, setSortBy] = useState('newest')

  useEffect(() => {
    Promise.all([
      fetch('/api/properties').then(r => r.json()),
      fetch('/api/agent').then(r => r.json()),
    ]).then(([props, agentData]) => {
      setProperties(props.filter((p: Property) => p.status === 'available'))
      setAgent(agentData)
      setLoading(false)
    })
  }, [])

  const filtered = properties.filter(p => {
    const ms = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.location.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase())
    const mt = filterType === 'all' || p.propertyType === filterType
    return ms && mt
  }).sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price
    if (sortBy === 'price-high') return b.price - a.price
    if (sortBy === 'size') return parseInt(b.size) - parseInt(a.size)
    return 0
  })

  function pi(j: string): string[] { try { return JSON.parse(j || '[]') } catch { return [] } }
  const ph = agent?.phone?.replace(/[^0-9]/g, '') || ''

  const stats = {
    total: properties.length,
    rent: properties.filter(p => ['Condominium','Apartment','Service Residence','Studio','Penthouse'].includes(p.propertyType)).length,
    buy: properties.filter(p => ['Terrace House','Semi-Detached','Bungalow','Townhouse','Duplex'].includes(p.propertyType)).length,
    freehold: properties.filter(p => p.tenure === 'Freehold').length,
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-100 via-white to-zinc-50" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-zinc-200/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-zinc-100/60 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
        <div className="absolute top-20 right-20 w-2 h-2 bg-zinc-400 rounded-full" />
        <div className="absolute top-40 right-40 w-1.5 h-1.5 bg-zinc-300 rounded-full" />
        <div className="absolute bottom-32 left-32 w-1.5 h-1.5 bg-zinc-300 rounded-full" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-100 text-zinc-700 text-xs font-semibold mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-pulse" />
                Available Properties
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4 leading-tight">
                Find Your<br />
                <span className="text-zinc-900">Dream Property</span>
              </h1>
              <p className="text-zinc-500 text-lg max-w-lg mb-8 leading-relaxed">
                {agent?.bio || `Browse our curated selection of premium properties across Malaysia. From luxury condos to landed houses, we have the perfect home for you.`}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                {ph && <a href={`https://wa.me/${ph}?text=${encodeURIComponent('Hi! I found your property listing.')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-lg shadow-zinc-900/20 active:scale-[0.97]">{WA} Chat on WhatsApp</a>}
                <a href="#listings" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-zinc-200 text-zinc-700 font-semibold hover:bg-zinc-50 transition-all">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>
                  View Listings
                </a>
              </div>
            </div>

            <div className="flex-shrink-0">
              {agent?.profilePic ? (
                <div className="relative">
                  <img src={agent.profilePic} alt={agent.name} className="w-64 h-64 sm:w-80 sm:h-80 rounded-3xl object-cover shadow-2xl shadow-zinc-200" />
                  <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-xl px-5 py-3 border border-zinc-100">
                    <p className="font-bold text-zinc-900">{agent.name}</p>
                    <p className="text-xs text-zinc-500">{agent.company}</p>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-3xl bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center shadow-2xl shadow-zinc-300">
                    <span className="text-8xl sm:text-9xl font-bold text-white/90">{agent?.name?.[0]?.toUpperCase() || 'J'}</span>
                  </div>
                  <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-xl px-5 py-3 border border-zinc-100">
                    <p className="font-bold text-zinc-900">{agent?.name || 'JCKSN'}</p>
                    <p className="text-xs text-zinc-500">{agent?.company || 'Property Agent'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-16 max-w-3xl mx-auto lg:mx-0">
            {[
              { v: stats.total, l: 'Properties', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" /></svg> },
              { v: stats.rent, l: 'For Rent', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg> },
              { v: stats.buy, l: 'For Sale', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg> },
              { v: stats.freehold, l: 'Freehold', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg> },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-600 mb-3">{s.icon}</div>
                <p className="text-3xl font-bold text-zinc-900">{s.v}</p>
                <p className="text-xs text-zinc-500 mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y border-zinc-200 bg-zinc-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-zinc-500">
            <div className="flex items-center gap-2"><svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" /></svg>Verified Agent</div>
            <div className="flex items-center gap-2"><svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>Free Consultation</div>
            <div className="flex items-center gap-2"><svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Quick Response</div>
            <div className="flex items-center gap-2"><svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" /></svg>Trusted Listings</div>
          </div>
        </div>
      </section>

      {/* Listings */}
      <section id="listings" className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">Featured Properties</h2>
          <p className="text-zinc-500">Explore our handpicked selection of premium properties</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-zinc-50 border border-zinc-200 flex-1">
            <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
            <input placeholder="Search location, title..." value={search} onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} className="bg-transparent border-0 p-0 text-sm text-black placeholder:text-zinc-400 focus:outline-none w-full" />
          </div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-black focus:outline-none appearance-none cursor-pointer">
            <option value="all">All Types</option>
            <option value="Condominium">Condominium</option>
            <option value="Apartment">Apartment</option>
            <option value="Service Residence">Service Residence</option>
            <option value="Terrace House">Terrace House</option>
            <option value="Semi-Detached">Semi-Detached</option>
            <option value="Bungalow">Bungalow</option>
            <option value="Studio">Studio</option>
            <option value="Penthouse">Penthouse</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-black focus:outline-none appearance-none cursor-pointer">
            <option value="newest">Newest</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="size">Largest</option>
          </select>
          <span className="text-sm text-zinc-400 flex items-center px-2">{filtered.length} results</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => <div key={i} className="rounded-2xl bg-zinc-50 border border-zinc-200 overflow-hidden animate-pulse"><div className="h-60 bg-zinc-200" /><div className="p-6 space-y-3"><div className="h-5 bg-zinc-200 rounded w-3/4" /><div className="h-4 bg-zinc-200 rounded w-1/2" /></div></div>)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 bg-zinc-50 rounded-3xl border border-zinc-200">
            <svg className="w-20 h-20 mx-auto text-zinc-300 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.75}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" /></svg>
            <p className="text-zinc-600 text-lg font-medium">No properties found</p>
            <p className="text-zinc-400 text-sm mt-2">Try adjusting your search or filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p) => {
              const imgs = pi(p.images)
              const psf = p.size ? Math.round(p.price / parseInt(p.size)) : 0
              return (
                    <div key={p.id} className="group bg-white rounded-2xl border border-zinc-200 overflow-hidden hover:border-zinc-400 hover:shadow-xl hover:shadow-zinc-200/50 transition-all duration-300 cursor-pointer" onClick={() => setSelected(p)}>
                  <div className="relative h-60 bg-zinc-100 overflow-hidden">
                    <Gallery images={imgs} title={p.title} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${p.tenure==='Freehold'?'bg-zinc-900 text-white':'bg-zinc-600 text-white'}`}>{p.tenure}</span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/90 text-zinc-800 backdrop-blur-sm">{p.propertyType}</span>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-2xl font-bold text-white drop-shadow-lg">RM {p.price.toLocaleString()}</p>
                      {psf>0&&<p className="text-xs text-white/80">RM {psf.toLocaleString()} psf</p>}
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-base font-semibold text-zinc-900 mb-1.5 line-clamp-1 group-hover:text-zinc-600 transition-colors">{p.title}</h3>
                    <div className="flex items-center gap-1.5 text-zinc-500 text-sm mb-3">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                      <span className="truncate">{p.location}{p.state?`, ${p.state}`:''}</span>
                    </div>
                    <p className="text-zinc-500 text-xs line-clamp-2 mb-4 leading-relaxed">{p.description}</p>
                    <div className="flex items-center gap-3 text-sm text-zinc-500 mb-4">
                      <span className="flex items-center gap-1">{p.bedrooms} bed</span>
                      <span className="w-1 h-1 rounded-full bg-zinc-300" />
                      <span className="flex items-center gap-1">{p.bathrooms} bath</span>
                      <span className="w-1 h-1 rounded-full bg-zinc-300" />
                      <span>{p.size} sqft</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-500 text-xs">{p.furnishing}</span>
                      <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-500 text-xs">{p.lotType}</span>
                      {p.carParks>0&&<span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-500 text-xs">{p.carParks} car</span>}
                    </div>
                    {ph&&<button onClick={e=>{e.stopPropagation();window.open(`https://wa.me/${ph}?text=${encodeURIComponent(`Hi! I'm interested in "${p.title}" at ${p.location}.`)}`,'_blank')}} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm transition-all active:scale-[0.98]">{WA} Inquire via WhatsApp</button>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* CTA */}
      {ph&&<section className="bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Can't Find What You're Looking For?</h2>
          <p className="text-zinc-400 text-lg mb-8 max-w-xl mx-auto">Contact us directly and we'll help you find the perfect property that matches your needs.</p>
          <a href={`https://wa.me/${ph}?text=${encodeURIComponent("Hi! I'm looking for a property. Can you help me?")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 bg-white text-zinc-900 font-semibold px-8 py-4 rounded-xl hover:bg-zinc-100 transition-all shadow-lg active:scale-[0.97]">{WA} Contact Us Now</a>
        </div>
      </section>}

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {agent?.profilePic ? <img src={agent.profilePic} alt="" className="w-10 h-10 rounded-xl object-cover" /> : <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white font-bold text-sm">{agent?.name?.[0]?.toUpperCase()||'J'}</div>}
              <div><p className="font-semibold text-zinc-900">{agent?.name||'JCKSN'}</p><p className="text-xs text-zinc-500">{agent?.company||'Property Agent'}</p></div>
            </div>
              {ph&&<a href={`https://wa.me/${ph}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors">{WA} Chat on WhatsApp</a>}
          </div>
          <div className="mt-6 pt-6 border-t border-zinc-200 text-center text-xs text-zinc-400">Powered by JCKSN</div>
        </div>
      </footer>

      {selected&&ph&&<DetailModal p={selected} phone={ph} onClose={()=>setSelected(null)} />}
    </div>
  )
}
