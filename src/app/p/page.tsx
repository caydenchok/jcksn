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

// Consistent icon set - Lucide-style, same stroke width
const Icons = {
  wa: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
  search: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>,
  bed: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/></svg>,
  bath: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  size: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"/></svg>,
  car: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"/></svg>,
  location: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/></svg>,
  chevronLeft: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>,
  chevronRight: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>,
  close: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>,
  building: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"/></svg>,
  home: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/></svg>,
  villa: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819"/></svg>,
  apartment: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21"/></svg>,
  arrow: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>,
}

function Gallery({ images, title }: { images: string[]; title: string }) {
  const [cur, setCur] = useState(0)
  if (!images.length) return <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200"><svg className="w-16 h-16 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.75}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21"/></svg></div>
  return (
    <div className="relative w-full h-full group/g">
      {images.map((s,i)=><img key={i} src={s} alt={`${title} photo ${i+1}`} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${i===cur?'opacity-100':'opacity-0'}`} loading="lazy"/>)}
      {images.length>1&&(<>
        <button onClick={(e)=>{e.stopPropagation();setCur(p=>p===0?images.length-1:p-1)}} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center opacity-0 group-hover/g:opacity-100 transition-all text-white hover:bg-black/60">{Icons.chevronLeft}</button>
        <button onClick={(e)=>{e.stopPropagation();setCur(p=>p===images.length-1?0:p+1)}} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center opacity-0 group-hover/g:opacity-100 transition-all text-white hover:bg-black/60">{Icons.chevronRight}</button>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">{images.map((_:any,i:number)=><button key={i} onClick={(e)=>{e.stopPropagation();setCur(i)}} className={`h-1.5 rounded-full transition-all duration-300 ${i===cur?'bg-white w-6':'bg-white/40 w-1.5 hover:bg-white/60'}`}/>)}</div>
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/40 backdrop-blur-md text-white text-[11px] font-medium">{cur+1}/{images.length}</div>
      </>)}
    </div>
  )
}

function DetailModal({p,phone,onClose}:{p:Property;phone:string;onClose:()=>void}) {
  const imgs=(()=>{try{return JSON.parse(p.images||'[]')}catch{return[]}})()
  const [cur,setCur]=useState(0)
  const psf=p.size?Math.round(p.price/parseInt(p.size)):0
  return(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"/>
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/10 flex items-center justify-center text-zinc-500 hover:bg-black/20 transition-colors">{Icons.close}</button>
        <div className="relative h-72 sm:h-96 bg-zinc-100 overflow-hidden sm:rounded-t-3xl">
          {imgs.length?(<>
            {imgs.map((s:string,i:number)=><img key={i} src={s} alt={`${p.title} photo ${i+1}`} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${i===cur?'opacity-100':'opacity-0'}`}/>)}
            {imgs.length>1&&(<>
              <button onClick={()=>setCur(v=>v===0?imgs.length-1:v-1)} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition-colors">{Icons.chevronLeft}</button>
              <button onClick={()=>setCur(v=>v===imgs.length-1?0:v+1)} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition-colors">{Icons.chevronRight}</button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">{imgs.map((_:string,i:number)=><button key={i} onClick={()=>setCur(i)} className={`h-2 rounded-full transition-all ${i===cur?'bg-white w-6':'bg-white/40 w-2'}`}/>)}</div>
            </>)}
            <div className="absolute top-4 left-4 flex gap-2">
              <span className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide ${p.tenure==='Freehold'?'bg-zinc-900 text-white':'bg-zinc-600 text-white'}`}>{p.tenure}</span>
              <span className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-white/90 text-zinc-800 backdrop-blur-sm">{p.propertyType}</span>
            </div>
          </>):<div className="w-full h-full flex items-center justify-center"><svg className="w-20 h-20 text-zinc-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.75}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21"/></svg></div>}
        </div>
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 mb-1">{p.title}</h2>
              <div className="flex items-center gap-2 text-zinc-500 text-sm">{Icons.location}<span>{p.location}{p.state?`, ${p.state}`:''}</span></div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-3xl font-bold text-zinc-900">RM {p.price.toLocaleString()}</p>
              {psf>0&&<p className="text-sm text-zinc-500">RM {psf.toLocaleString()} psf</p>}
            </div>
          </div>
          <p className="text-zinc-600 text-sm leading-relaxed mb-6">{p.description}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[{v:p.bedrooms,l:'Bedrooms',icon:Icons.bed},{v:p.bathrooms,l:'Bathrooms',icon:Icons.bath},{v:p.carParks,l:'Car Parks',icon:Icons.car},{v:`${p.size} sqft`,l:'Built-up',icon:Icons.size}].map((x,i)=><div key={i} className="bg-zinc-50 rounded-xl p-4 text-center border border-zinc-100"><div className="text-zinc-400 flex justify-center mb-2">{x.icon}</div><p className="text-xl font-bold text-zinc-900">{x.v}</p><p className="text-[11px] text-zinc-500 mt-1">{x.l}</p></div>)}
          </div>
          <div className="flex flex-wrap gap-2 mb-6">
            {[p.furnishing,p.lotType,p.landSize&&`${p.landSize} sqft land`,p.state&&p.state].filter(Boolean).map((t,i)=><span key={i} className="px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-600 text-xs font-medium border border-zinc-200">{t}</span>)}
          </div>
          {phone&&<a href={`https://wa.me/${phone}?text=${encodeURIComponent(`Hi! I'm interested in "${p.title}" at ${p.location}.`)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2.5 w-full py-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold transition-all active:scale-[0.98] shadow-lg">{Icons.wa} Inquire via WhatsApp</a>}
        </div>
      </div>
    </div>
  )
}

export default function PublicListingsPage() {
  const [properties,setProperties]=useState<Property[]>([])
  const [agent,setAgent]=useState<AgentProfile|null>(null)
  const [search,setSearch]=useState('')
  const [filterType,setFilterType]=useState('all')
  const [loading,setLoading]=useState(true)
  const [selected,setSelected]=useState<Property|null>(null)
  const [sortBy,setSortBy]=useState('newest')

  useEffect(()=>{
    Promise.all([fetch('/api/properties').then(r=>r.json()),fetch('/api/agent').then(r=>r.json())]).then(([props,agentData])=>{
      setProperties(props.filter((p:Property)=>p.status==='available'))
      setAgent(agentData)
      setLoading(false)
    })
  },[])

  const filtered=properties.filter(p=>{
    const ms=!search||p.title.toLowerCase().includes(search.toLowerCase())||p.location.toLowerCase().includes(search.toLowerCase())||p.description.toLowerCase().includes(search.toLowerCase())
    const mt=filterType==='all'||p.propertyType===filterType
    return ms&&mt
  }).sort((a,b)=>{
    if(sortBy==='price-low')return a.price-b.price
    if(sortBy==='price-high')return b.price-a.price
    if(sortBy==='size')return parseInt(b.size)-parseInt(a.size)
    return 0
  })

  function pi(j:string):string[]{try{return JSON.parse(j||'[]')}catch{return[]}}
  const ph=agent?.phone?.replace(/[^0-9]/g,'')||''

  const stats={total:properties.length,rent:properties.filter(p=>['Condominium','Apartment','Service Residence','Studio','Penthouse'].includes(p.propertyType)).length,buy:properties.filter(p=>['Terrace House','Semi-Detached','Bungalow','Townhouse','Duplex'].includes(p.propertyType)).length,freehold:properties.filter(p=>p.tenure==='Freehold').length}

  const categories=[
    {name:'Condo',type:'Condominium',icon:Icons.building,count:properties.filter(p=>p.propertyType==='Condominium').length},
    {name:'House',type:'Terrace House',icon:Icons.home,count:properties.filter(p=>p.propertyType==='Terrace House').length},
    {name:'Semi-D',type:'Semi-Detached',icon:Icons.villa,count:properties.filter(p=>p.propertyType==='Semi-Detached').length},
    {name:'Studio',type:'Studio',icon:Icons.apartment,count:properties.filter(p=>p.propertyType==='Studio').length},
  ]

  return(
    <div className="min-h-screen bg-white text-zinc-900 font-sans">
      {/* Hero - Full viewport with property image */}
      <section className="relative h-[90vh] min-h-[600px] overflow-hidden bg-zinc-950 text-white">
        {/* Background image with overlay */}
        <div className="absolute inset-0">
          {properties.length>0&&(()=>{
            const heroImgs=pi(properties[0].images)
            return heroImgs.length>0?<img src={heroImgs[0]} alt="" className="w-full h-full object-cover opacity-40"/>:null
          })()}
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/95 via-zinc-950/80 to-zinc-950/60"/>
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-zinc-950/40"/>
        </div>

        {/* Content */}
        <div className="relative h-full max-w-7xl mx-auto px-6 sm:px-8 flex flex-col justify-center">
          <div className="max-w-2xl">
            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm font-medium mb-8 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse"/>
              {stats.total} Properties Available
            </div>

            {/* Main heading - tight tracking, large size */}
            <h1 className="text-5xl sm:text-6xl lg:text-[5.5rem] font-bold tracking-tighter mb-6 leading-[1.05]">
              Find Your<br/>
              <span className="text-zinc-400">Perfect Home</span>
            </h1>

            {/* Subtitle */}
            <p className="text-zinc-400 text-lg sm:text-xl max-w-lg mb-12 leading-relaxed">
              {agent?.bio||'Premium properties across Malaysia. From luxury condos to landed houses, curated for you.'}
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              {ph&&<a href={`https://wa.me/${ph}?text=${encodeURIComponent('Hi! I found your property listing.')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2.5 bg-white text-zinc-900 font-semibold px-8 py-4 rounded-xl hover:bg-zinc-100 transition-all duration-200 shadow-2xl active:scale-[0.97]">{Icons.wa} Chat on WhatsApp</a>}
              <a href="#listings" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/10 transition-all duration-200 backdrop-blur-sm">
                View Listings {Icons.arrow}
              </a>
            </div>
          </div>

          {/* Agent card - floating */}
          {agent&&(
            <div className="absolute bottom-12 right-8 hidden lg:flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              {agent.profilePic?<img src={agent.profilePic} alt={agent.name} className="w-12 h-12 rounded-xl object-cover"/>:<div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold">{agent.name?.[0]?.toUpperCase()||'J'}</div>}
              <div>
                <p className="font-semibold text-white">{agent.name}</p>
                <p className="text-xs text-zinc-400">{agent.company}</p>
              </div>
            </div>
          )}
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-zinc-500">
          <span className="text-xs font-medium uppercase tracking-widest">Scroll</span>
          <div className="w-5 h-8 rounded-full border border-zinc-600 flex justify-center pt-1.5">
            <div className="w-1 h-2 bg-zinc-500 rounded-full animate-bounce"/>
          </div>
        </div>
      </section>

      {/* Stats - Overlapping hero */}
      <section className="relative z-10 -mt-16 mb-16">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[{v:stats.total,l:'Total Properties'},{v:stats.rent,l:'For Rent'},{v:stats.buy,l:'For Sale'},{v:stats.freehold,l:'Freehold'}].map((s,i)=>(
              <div key={i} className="bg-white rounded-2xl p-6 text-center shadow-xl shadow-zinc-200/50 border border-zinc-100">
                <p className="text-4xl font-bold text-zinc-900 tracking-tight">{s.v}</p>
                <p className="text-xs text-zinc-500 mt-2 font-medium uppercase tracking-wider">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust indicators */}
      <section className="py-12 border-y border-zinc-100 bg-zinc-50/50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 text-sm text-zinc-500">
            {['Verified Agent','Free Consultation','Quick Response','Trusted Listings'].map((item,i)=>(
              <div key={i} className="flex items-center gap-2">
                <svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"/></svg>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Browse by Type */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 mb-3">Browse by Type</h2>
            <p className="text-zinc-500 text-lg">Find the perfect property type for you</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {categories.map((cat,i)=>(
              <button key={i} onClick={()=>{setFilterType(cat.type===filterType?'all':cat.type);document.getElementById('listings')?.scrollIntoView({behavior:'smooth'})}} className={`p-6 rounded-2xl border transition-all duration-200 text-left ${filterType===cat.type?'bg-zinc-900 text-white border-zinc-900 shadow-xl':'bg-white border-zinc-200 hover:border-zinc-300 hover:shadow-lg'}`}>
                <div className={`mb-4 ${filterType===cat.type?'text-white':'text-zinc-400'}`}>{cat.icon}</div>
                <p className="font-semibold text-lg">{cat.name}</p>
                <p className={`text-sm mt-1 ${filterType===cat.type?'text-zinc-400':'text-zinc-500'}`}>{cat.count} listings</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section id="listings" className="py-20 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 mb-3">Featured Properties</h2>
            <p className="text-zinc-500 text-lg">Handpicked premium properties for you</p>
          </div>

          {/* Search & Filter bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-10">
            <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-white border border-zinc-200 shadow-sm flex-1">
              <span className="text-zinc-400">{Icons.search}</span>
              <input placeholder="Search location, title..." value={search} onChange={(e:ChangeEvent<HTMLInputElement>)=>setSearch(e.target.value)} className="bg-transparent border-0 p-0 text-sm text-black placeholder:text-zinc-400 focus:outline-none w-full"/>
            </div>
            <select value={filterType} onChange={(e)=>setFilterType(e.target.value)} className="px-5 py-3.5 rounded-xl bg-white border border-zinc-200 text-sm text-black focus:outline-none shadow-sm cursor-pointer">
              <option value="all">All Types</option>
              {categories.map(c=><option key={c.type} value={c.type}>{c.name}</option>)}
            </select>
            <select value={sortBy} onChange={(e)=>setSortBy(e.target.value)} className="px-5 py-3.5 rounded-xl bg-white border border-zinc-200 text-sm text-black focus:outline-none shadow-sm cursor-pointer">
              <option value="newest">Newest</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="size">Largest</option>
            </select>
            <span className="text-sm text-zinc-400 flex items-center px-2">{filtered.length} results</span>
          </div>

          {/* Loading skeleton */}
          {loading?(
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3,4,5,6].map(i=><div key={i} className="rounded-2xl bg-white border border-zinc-200 overflow-hidden animate-pulse"><div className="h-64 bg-zinc-100"/><div className="p-6 space-y-3"><div className="h-5 bg-zinc-100 rounded w-3/4"/><div className="h-4 bg-zinc-100 rounded w-1/2"/><div className="h-3 bg-zinc-100 rounded w-2/3"/></div></div>)}
            </div>
          ):filtered.length===0?(
            <div className="text-center py-24 bg-white rounded-3xl border border-zinc-200">
              <svg className="w-20 h-20 mx-auto text-zinc-200 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.75}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21"/></svg>
              <p className="text-zinc-600 text-lg font-medium">No properties found</p>
              <p className="text-zinc-400 text-sm mt-2">Try adjusting your search</p>
            </div>
          ):(
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(p=>{
                const imgs=pi(p.images)
                const psf=p.size?Math.round(p.price/parseInt(p.size)):0
                return(
                  <div key={p.id} className="group bg-white rounded-2xl border border-zinc-200 overflow-hidden hover:shadow-xl hover:shadow-zinc-200/50 transition-all duration-300 cursor-pointer" onClick={()=>setSelected(p)}>
                    {/* Image */}
                    <div className="relative h-64 bg-zinc-100 overflow-hidden">
                      <Gallery images={imgs} title={p.title}/>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none"/>
                      <div className="absolute top-3 left-3 flex gap-1.5">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold tracking-wide ${p.tenure==='Freehold'?'bg-zinc-900 text-white':'bg-zinc-600 text-white'}`}>{p.tenure}</span>
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/90 text-zinc-800 backdrop-blur-sm">{p.propertyType}</span>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3">
                        <p className="text-2xl font-bold text-white drop-shadow-lg">RM {p.price.toLocaleString()}</p>
                        {psf>0&&<p className="text-xs text-white/70">RM {psf.toLocaleString()} psf</p>}
                      </div>
                    </div>
                    {/* Content */}
                    <div className="p-5">
                      <h3 className="text-base font-semibold text-zinc-900 mb-1.5 line-clamp-1 group-hover:text-zinc-600 transition-colors">{p.title}</h3>
                      <div className="flex items-center gap-1.5 text-zinc-500 text-sm mb-3">
                        {Icons.location}
                        <span className="truncate">{p.location}{p.state?`, ${p.state}`:''}</span>
                      </div>
                      <p className="text-zinc-500 text-xs line-clamp-2 mb-4 leading-relaxed">{p.description}</p>
                      {/* Property details */}
                      <div className="flex items-center gap-4 text-sm text-zinc-500 mb-4">
                        <span className="flex items-center gap-1.5">{Icons.bed}<span>{p.bedrooms}</span></span>
                        <span className="flex items-center gap-1.5">{Icons.bath}<span>{p.bathrooms}</span></span>
                        <span className="flex items-center gap-1.5">{Icons.size}<span>{p.size} sqft</span></span>
                      </div>
                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-500 text-[11px] font-medium">{p.furnishing}</span>
                        <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-500 text-[11px] font-medium">{p.lotType}</span>
                        {p.carParks>0&&<span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-500 text-[11px] font-medium">{p.carParks} car</span>}
                      </div>
                      {/* CTA */}
                      {ph&&<button onClick={e=>{e.stopPropagation();window.open(`https://wa.me/${ph}?text=${encodeURIComponent(`Hi! I'm interested in "${p.title}" at ${p.location}.`)}`,'_blank')}} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm transition-all duration-200 active:scale-[0.98]">{Icons.wa} Inquire via WhatsApp</button>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      {ph&&<section className="bg-zinc-900 text-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-24 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Can't Find What You're Looking For?</h2>
          <p className="text-zinc-400 text-lg mb-10 max-w-xl mx-auto">Contact us directly and we'll help you find the perfect property that matches your needs.</p>
          <a href={`https://wa.me/${ph}?text=${encodeURIComponent("Hi! I'm looking for a property. Can you help me?")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 bg-white text-zinc-900 font-semibold px-10 py-4 rounded-xl hover:bg-zinc-100 transition-all duration-200 shadow-2xl active:scale-[0.97]">{Icons.wa} Contact Us Now</a>
        </div>
      </section>}

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {agent?.profilePic?<img src={agent.profilePic} alt={agent.name} className="w-12 h-12 rounded-xl object-cover"/>:<div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center text-white font-bold text-lg">{agent?.name?.[0]?.toUpperCase()||'J'}</div>}
              <div>
                <p className="font-semibold text-zinc-900 text-lg">{agent?.name||'JCKSN'}</p>
                <p className="text-sm text-zinc-500">{agent?.company||'Property Agent'}</p>
              </div>
            </div>
            {ph&&<a href={`https://wa.me/${ph}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors">{Icons.wa} Chat on WhatsApp</a>}
          </div>
          <div className="mt-8 pt-8 border-t border-zinc-100 text-center text-xs text-zinc-400">Powered by JCKSN</div>
        </div>
      </footer>

      {/* Detail Modal */}
      {selected&&ph&&<DetailModal p={selected} phone={ph} onClose={()=>setSelected(null)}/>}
    </div>
  )
}
