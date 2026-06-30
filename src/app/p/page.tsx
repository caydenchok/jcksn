'use client'

import { useEffect, useState, useRef, ChangeEvent, ReactNode } from 'react'
import { BRAND } from '@/lib/brand'

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
  email: string
  company: string
  licenseNo: string
  tagline: string
  bio: string
  languages: string
  specialities: string
  profilePic: string
}

const GOLD = '#E2A93B'   // fills, lines, icons, badges
const GOLDT = '#96701A'  // gold text on white (AA contrast)
const fontDisplay = { fontFamily: 'var(--font-display, Georgia, serif)' }
const fontBody = { fontFamily: 'var(--font-body, system-ui, sans-serif)' }
const EASE = 'cubic-bezier(0.16,1,0.3,1)'

const prefersReduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

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
  check: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>,
}

// Scroll-reveal wrapper. variant: 'up' (fade-up) | 'clip' (mask wipe up) | 'scale'
function Reveal({ children, className = '', delay = 0, variant = 'up', once = true, as = 'div' }: { children: ReactNode; className?: string; delay?: number; variant?: 'up' | 'clip' | 'scale'; once?: boolean; as?: 'div' | 'section' }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (prefersReduced()) { setShown(true); return }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { setShown(true); if (once) io.disconnect() }
        else if (!once) setShown(false)
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [once])
  const Tag: any = as
  const states = variant === 'clip'
    ? (shown ? 'opacity-100 [clip-path:inset(0_0_0_0)]' : 'opacity-100 [clip-path:inset(0_0_100%_0)]')
    : variant === 'scale'
      ? (shown ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.96]')
      : (shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12')
  return (
    <Tag ref={ref} className={`${className} will-change-transform transition-all duration-[1100ms] ${states}`} style={{ transitionTimingFunction: EASE, transitionDelay: `${delay}ms` }}>
      {children}
    </Tag>
  )
}

// Headline with word-by-word mask-up reveal (Igloo-style). Animates on mount.
function Words({ text, className = '', style }: { text: string; className?: string; style?: React.CSSProperties }) {
  const [m, setM] = useState(false)
  useEffect(() => { if (prefersReduced()) { setM(true); return } const t = setTimeout(() => setM(true), 60); return () => clearTimeout(t) }, [])
  return (
    <span className={className} style={style}>
      {text.split(' ').map((w, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom">
          <span className={`inline-block pb-[0.12em] -mb-[0.12em] transition-all duration-[1000ms] ${m ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`} style={{ transitionTimingFunction: EASE, transitionDelay: `${i * 90}ms` }}>
            {w}&nbsp;
          </span>
        </span>
      ))}
    </span>
  )
}

// Count-up number, triggered when scrolled into view
function StatNum({ value }: { value: number }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [val, setVal] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (prefersReduced()) { setVal(value); return }
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        io.disconnect()
        const dur = 1400, start = performance.now()
        let raf = 0
        const tick = (now: number) => {
          const t = Math.min((now - start) / dur, 1)
          setVal(Math.round((1 - Math.pow(1 - t, 3)) * value))
          if (t < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      }
    }, { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [value])
  return <p ref={ref} className="font-semibold tracking-tight" style={{ ...fontDisplay, color: GOLDT, fontSize: 'clamp(2.5rem,5vw,4rem)' }}>{val}</p>
}

function Gallery({ images, title }: { images: string[]; title: string }) {
  const [cur, setCur] = useState(0)
  if (!images.length) return <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200"><svg className="w-16 h-16 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.75}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21"/></svg></div>
  return (
    <div className="relative w-full h-full group/g">
      {images.map((s,i)=><img key={i} src={s} alt={`${title} photo ${i+1}`} className={`absolute inset-0 w-full h-full object-cover transition-all duration-[900ms] ${i===cur?'opacity-100 scale-100':'opacity-0 scale-105'}`} style={{transitionTimingFunction:EASE}} loading="lazy"/>)}
      {images.length>1&&(<>
        <button aria-label="Previous photo" onClick={(e)=>{e.stopPropagation();setCur(p=>p===0?images.length-1:p-1)}} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center opacity-0 group-hover/g:opacity-100 transition-all text-neutral-800 hover:bg-white shadow-md">{Icons.chevronLeft}</button>
        <button aria-label="Next photo" onClick={(e)=>{e.stopPropagation();setCur(p=>p===images.length-1?0:p+1)}} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center opacity-0 group-hover/g:opacity-100 transition-all text-neutral-800 hover:bg-white shadow-md">{Icons.chevronRight}</button>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">{images.map((_:any,i:number)=><button aria-label={`Go to photo ${i+1}`} key={i} onClick={(e)=>{e.stopPropagation();setCur(i)}} className={`h-1 rounded-full transition-all duration-300 ${i===cur?'bg-white w-6':'bg-white/60 w-3 hover:bg-white'}`}/>)}</div>
      </>)}
    </div>
  )
}

function DetailModal({p,phone,agentName,onClose}:{p:Property;phone:string;agentName:string;onClose:()=>void}) {
  const imgs=(()=>{try{return JSON.parse(p.images||'[]')}catch{return[]}})()
  const [cur,setCur]=useState(0)
  const psf=p.size?Math.round(p.price/parseInt(p.size)):0
  useEffect(()=>{const prev=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=prev}},[])
  return(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose} style={fontBody}>
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"/>
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <button aria-label="Close" onClick={onClose} className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/90 shadow flex items-center justify-center text-neutral-600 hover:bg-white transition-colors">{Icons.close}</button>
        <div className="relative h-72 sm:h-96 bg-neutral-100 overflow-hidden sm:rounded-t-3xl">
          {imgs.length?(<>
            {imgs.map((s:string,i:number)=><img key={i} src={s} alt={`${p.title} photo ${i+1}`} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${i===cur?'opacity-100':'opacity-0'}`}/>)}
            {imgs.length>1&&(<>
              <button aria-label="Previous photo" onClick={()=>setCur(v=>v===0?imgs.length-1:v-1)} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 flex items-center justify-center text-neutral-800 hover:bg-white transition-colors shadow">{Icons.chevronLeft}</button>
              <button aria-label="Next photo" onClick={()=>setCur(v=>v===imgs.length-1?0:v+1)} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 flex items-center justify-center text-neutral-800 hover:bg-white transition-colors shadow">{Icons.chevronRight}</button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">{imgs.map((_:string,i:number)=><button aria-label={`Go to photo ${i+1}`} key={i} onClick={()=>setCur(i)} className={`h-1.5 rounded-full transition-all ${i===cur?'bg-white w-6':'bg-white/60 w-2'}`}/>)}</div>
            </>)}
            <div className="absolute top-4 left-4 flex gap-2">
              <span className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide ${p.tenure==='Freehold'?'text-black':'bg-white/90 text-neutral-800 backdrop-blur-sm'}`} style={p.tenure==='Freehold'?{background:GOLD}:undefined}>{p.tenure}</span>
              <span className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-white/90 text-neutral-800 backdrop-blur-sm">{p.propertyType}</span>
            </div>
          </>):<div className="w-full h-full flex items-center justify-center"><svg className="w-20 h-20 text-neutral-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.75}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21"/></svg></div>}
        </div>
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900 mb-1.5" style={fontDisplay}>{p.title}</h2>
              <div className="flex items-center gap-2 text-neutral-500 text-sm">{Icons.location}<span>{p.location}{p.state?`, ${p.state}`:''}</span></div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-3xl font-semibold" style={{...fontDisplay,color:GOLDT}}>RM {p.price.toLocaleString()}</p>
              {psf>0&&<p className="text-sm text-neutral-500">RM {psf.toLocaleString()} psf</p>}
            </div>
          </div>
          <p className="text-neutral-600 text-sm leading-relaxed mb-6">{p.description}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[{v:p.bedrooms,l:'Bedrooms',icon:Icons.bed},{v:p.bathrooms,l:'Bathrooms',icon:Icons.bath},{v:p.carParks,l:'Car Parks',icon:Icons.car},{v:`${p.size} sqft`,l:'Built-up',icon:Icons.size}].map((x,i)=><div key={i} className="bg-neutral-50 rounded-xl p-4 text-center border border-neutral-100"><div className="flex justify-center mb-2" style={{color:GOLDT}}>{x.icon}</div><p className="text-xl font-bold text-neutral-900">{x.v}</p><p className="text-[11px] text-neutral-500 mt-1">{x.l}</p></div>)}
          </div>
          <div className="flex flex-wrap gap-2 mb-6">
            {[p.furnishing,p.lotType,p.landSize&&`${p.landSize} sqft land`,p.state&&p.state].filter(Boolean).map((t,i)=><span key={i} className="px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-600 text-xs font-medium border border-neutral-200">{t}</span>)}
          </div>
          <a href={`https://wa.me/${phone}?text=${encodeURIComponent(`Hi ${agentName}! I'm interested in "${p.title}" at ${p.location}.`)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2.5 w-full py-4 rounded-full bg-[#25D366] hover:bg-[#1ebe5a] text-white font-semibold transition-all active:scale-[0.98] shadow-lg">{Icons.wa} Enquire on WhatsApp</a>
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
  const [progress,setProgress]=useState(0)
  const [scrolled,setScrolled]=useState(false)
  const heroImgRef=useRef<HTMLImageElement>(null)

  useEffect(()=>{
    Promise.all([
      fetch('/api/properties').then(r=>r.ok?r.json():[]),
      fetch('/api/agent').then(r=>r.ok?r.json():null)
    ]).then(([props,agentData])=>{
      setProperties(Array.isArray(props)?props.filter((p:Property)=>p.status==='available'):[])
      setAgent(agentData)
      setLoading(false)
    }).catch(()=>setLoading(false))
  },[])

  useEffect(()=>{
    const reduced=prefersReduced()
    let raf=0
    const onScroll=()=>{
      if(raf)return
      raf=requestAnimationFrame(()=>{
        raf=0
        const h=document.documentElement
        const max=h.scrollHeight-h.clientHeight
        setProgress(max>0?h.scrollTop/max:0)
        setScrolled(h.scrollTop>24)
        if(!reduced&&heroImgRef.current){heroImgRef.current.style.transform=`translate3d(0, ${h.scrollTop*0.18}px, 0) scale(1.12)`}
      })
    }
    onScroll()
    window.addEventListener('scroll',onScroll,{passive:true})
    return ()=>{window.removeEventListener('scroll',onScroll);if(raf)cancelAnimationFrame(raf)}
  },[])

  // Brand-safe display values — fall back to ZERO88 brand if Settings is empty
  const agentName=agent?.name||BRAND.agent
  const company=agent?.company||BRAND.company
  const ren=agent?.licenseNo||BRAND.ren
  const tagline=agent?.tagline||BRAND.tagline
  const email=agent?.email||BRAND.email
  const bio=agent?.bio||'A trusted local negotiator helping clients buy, sell and rent across Kota Kinabalu and greater Sabah — with honest advice, sharp market knowledge and a personal touch from first message to handover.'
  const profilePic=agent?.profilePic||''
  const specialities=(agent?.specialities||'Residential, Commercial').split(',').map(s=>s.trim()).filter(Boolean)
  const languages=(agent?.languages||'English, Malay, Chinese').split(',').map(s=>s.trim()).filter(Boolean)
  const ph=agent?.phone?.replace(/[^0-9]/g,'')||BRAND.phone

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

  const stats={total:properties.length,rent:properties.filter(p=>['Condominium','Apartment','Service Residence','Studio','Penthouse'].includes(p.propertyType)).length,buy:properties.filter(p=>['Terrace House','Semi-Detached','Bungalow','Townhouse','Duplex'].includes(p.propertyType)).length,freehold:properties.filter(p=>p.tenure==='Freehold').length}

  const categories=[
    {name:'Condo',type:'Condominium',icon:Icons.building,count:properties.filter(p=>p.propertyType==='Condominium').length},
    {name:'House',type:'Terrace House',icon:Icons.home,count:properties.filter(p=>p.propertyType==='Terrace House').length},
    {name:'Semi-D',type:'Semi-Detached',icon:Icons.villa,count:properties.filter(p=>p.propertyType==='Semi-Detached').length},
    {name:'Studio',type:'Studio',icon:Icons.apartment,count:properties.filter(p=>p.propertyType==='Studio').length},
  ]

  const heroImg=properties.length>0?pi(properties[0].images)[0]:undefined
  const showcaseImg=properties.length>1?pi(properties[1].images)[0]:heroImg
  const waHref=(msg:string)=>`https://wa.me/${ph}?text=${encodeURIComponent(msg)}`

  const valueProps=[
    {n:'01',t:'Local Sabah expertise',d:'Deep, on-the-ground knowledge of Kota Kinabalu neighbourhoods, pricing and upcoming launches — so you move with confidence.'},
    {n:'02',t:'Honest negotiation',d:'A licensed negotiator (REN 37532) working in your interest. Transparent advice, no pressure, and the best possible terms.'},
    {n:'03',t:'End-to-end support',d:'From first WhatsApp to signing and handover — viewings, paperwork and financing guidance handled for you.'},
  ]

  return(
    <div className="min-h-dvh bg-[#FBFAF8] text-neutral-900 selection:bg-[#E2A93B] selection:text-black antialiased" style={fontBody}>
      <style>{`html{scroll-behavior:smooth}@keyframes zmarquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}@media (prefers-reduced-motion: reduce){.z-marquee{animation:none!important}html{scroll-behavior:auto}}`}</style>

      {/* Scroll progress */}
      <div className="fixed top-0 left-0 right-0 h-[2px] z-[90] bg-transparent">
        <div className="h-full origin-left" style={{background:`linear-gradient(90deg, ${GOLD}, #F5D27A)`,transform:`scaleX(${progress})`}}/>
      </div>

      {/* Nav */}
      <header className={`fixed top-0 inset-x-0 z-[80] transition-all duration-500 ${scrolled?'bg-white/85 backdrop-blur-xl border-b border-black/5 shadow-[0_1px_20px_-10px_rgba(0,0,0,0.3)]':'bg-transparent border-b border-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8 h-16 sm:h-20 flex items-center justify-between">
          <a href="#top" className="flex items-baseline gap-2">
            <span className={`text-xl sm:text-2xl font-bold tracking-[0.2em] transition-colors ${scrolled?'text-neutral-900':'text-neutral-900'}`} style={fontDisplay}>ZERO<span style={{color:GOLD}}>88</span></span>
            <span className="hidden sm:inline text-[10px] tracking-[0.3em] text-neutral-400 uppercase">Property</span>
          </a>
          <nav className="hidden md:flex items-center gap-8 text-sm text-neutral-600">
            <a href="#listings" className="hover:text-neutral-900 transition-colors">Listings</a>
            <a href="#browse" className="hover:text-neutral-900 transition-colors">Categories</a>
            <a href="#approach" className="hover:text-neutral-900 transition-colors">Approach</a>
            <a href="#agent" className="hover:text-neutral-900 transition-colors">About</a>
          </nav>
          <a href={waHref(`Hi ${agentName}! I found your property page and would like to know more.`)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold px-4 sm:px-5 py-2.5 rounded-full bg-neutral-900 text-white hover:bg-neutral-800 transition-all active:scale-95">
            <span className="hidden sm:inline">WhatsApp</span><span className="sm:hidden">Chat</span>
          </a>
        </div>
      </header>

      {/* Hero */}
      <section id="top" className="relative min-h-dvh flex flex-col justify-center overflow-hidden pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 w-full grid lg:grid-cols-12 gap-10 items-center">
          {/* copy */}
          <div className="lg:col-span-6 relative z-10">
            <Reveal>
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border bg-white text-[11px] sm:text-xs font-medium tracking-[0.15em] uppercase mb-8 shadow-sm" style={{borderColor:`${GOLD}55`,color:GOLDT}}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background:GOLD}}/>
                {ren} · {BRAND.region}
              </div>
            </Reveal>
            <h1 className="font-semibold text-neutral-900 tracking-tight leading-[0.95] mb-7" style={{...fontDisplay,fontSize:'clamp(2.75rem,6.5vw,6rem)'}}>
              <Words text="Find your place" />
              <br/>
              <span className="italic" style={{color:GOLDT}}><Words text="in Sabah." /></span>
            </h1>
            <Reveal delay={500}>
              <p className="text-neutral-600 text-base sm:text-xl max-w-lg mb-10 leading-relaxed">
                {tagline}. Buy, sell and rent residential &amp; commercial property in {BRAND.city} with {agentName}.
              </p>
            </Reveal>
            <Reveal delay={620}>
              <div className="flex flex-col sm:flex-row gap-4">
                <a href={waHref(`Hi ${agentName}! I found your property page and would like to know more.`)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#1ebe5a] text-white font-semibold px-8 py-4 rounded-full transition-all duration-200 shadow-[0_10px_40px_-12px_rgba(37,211,102,0.7)] active:scale-[0.97]">{Icons.wa} Chat on WhatsApp</a>
                <a href="#listings" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full border border-neutral-300 text-neutral-800 font-semibold hover:border-neutral-900 hover:bg-white transition-all duration-200">
                  Explore listings {Icons.arrow}
                </a>
              </div>
            </Reveal>
          </div>

          {/* hero image */}
          <div className="lg:col-span-6 relative">
            <Reveal variant="clip" delay={200} className="relative aspect-[4/5] sm:aspect-[3/4] lg:aspect-[4/5] rounded-[2rem] overflow-hidden shadow-[0_40px_80px_-30px_rgba(0,0,0,0.35)] border border-black/5">
              {heroImg?<img ref={heroImgRef} src={heroImg} alt="Featured property" className="absolute inset-0 w-full h-full object-cover will-change-transform" style={{transform:'scale(1.12)'}}/>:<div className="absolute inset-0 bg-gradient-to-br from-neutral-200 to-neutral-100"/>}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"/>
            </Reveal>
            {/* floating agent chip */}
            <Reveal delay={500} className="absolute -bottom-5 left-4 sm:-left-6 bg-white rounded-2xl shadow-xl border border-black/5 p-4 flex items-center gap-3">
              {profilePic?<img src={profilePic} alt={agentName} className="w-12 h-12 rounded-xl object-cover"/>:<div className="w-12 h-12 rounded-xl flex items-center justify-center text-black font-bold" style={{background:GOLD,...fontDisplay}}>{agentName[0]?.toUpperCase()}</div>}
              <div>
                <p className="font-semibold text-neutral-900 text-sm leading-tight">{agentName}</p>
                <p className="text-xs" style={{color:GOLDT}}>{BRAND.jobTitle}</p>
              </div>
            </Reveal>
          </div>
        </div>

        {/* scroll cue */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden sm:flex flex-col items-center gap-2 text-neutral-400">
          <span className="text-[10px] font-medium uppercase tracking-[0.3em]">Scroll</span>
          <div className="w-5 h-8 rounded-full border border-neutral-300 flex justify-center pt-1.5">
            <div className="w-1 h-2 rounded-full animate-bounce" style={{background:GOLD}}/>
          </div>
        </div>
      </section>

      {/* Marquee strip */}
      <div className="relative border-y border-black/[0.07] bg-white overflow-hidden py-5">
        <div className="z-marquee flex w-max gap-12 whitespace-nowrap" style={{animation:'zmarquee 30s linear infinite'}}>
          {Array.from({length:2}).map((_,r)=>(
            <div key={r} className="flex items-center gap-12">
              {['Buy','Sell','Rent','Kota Kinabalu','Sabah','Residential','Commercial','Trusted Negotiator'].map((t,i)=>(
                <span key={i} className="flex items-center gap-12 text-2xl sm:text-3xl font-medium text-neutral-300" style={fontDisplay}>
                  {t}<span className="text-lg" style={{color:GOLD}}>✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-black/[0.07] border-y border-black/[0.07]">
            {[{v:stats.total,l:'Properties'},{v:stats.rent,l:'For Rent'},{v:stats.buy,l:'For Sale'},{v:stats.freehold,l:'Freehold'}].map((s,i)=>(
              <Reveal key={i} delay={i*90} className="px-4 sm:px-8 py-10 text-center">
                <StatNum value={s.v}/>
                <p className="text-[11px] text-neutral-500 mt-2 font-medium uppercase tracking-[0.2em]">{s.l}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Browse by Type */}
      <section id="browse" className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <Reveal className="mb-14">
            <p className="text-xs font-medium uppercase tracking-[0.25em] mb-4" style={{color:GOLDT}}>— Explore</p>
            <h2 className="font-semibold text-neutral-900 tracking-tight" style={{...fontDisplay,fontSize:'clamp(2rem,5vw,3.5rem)'}}>Browse by type</h2>
          </Reveal>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((cat,i)=>(
              <Reveal key={i} delay={i*80} variant="scale">
                <button onClick={()=>{setFilterType(cat.type===filterType?'all':cat.type);document.getElementById('listings')?.scrollIntoView({behavior:'smooth'})}} className={`group w-full p-7 rounded-2xl border text-left transition-all duration-300 hover:-translate-y-1 ${filterType===cat.type?'text-black shadow-lg':'bg-white border-black/[0.07] text-neutral-700 hover:shadow-xl hover:border-black/10'}`} style={filterType===cat.type?{background:GOLD,borderColor:GOLD}:undefined}>
                  <div className="mb-8 transition-colors" style={{color:filterType===cat.type?'#1a1a1a':GOLDT}}>{cat.icon}</div>
                  <p className="font-semibold text-lg" style={fontDisplay}>{cat.name}</p>
                  <p className={`text-sm mt-1 ${filterType===cat.type?'text-black/70':'text-neutral-500'}`}>{cat.count} listings</p>
                </button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Approach — sticky editorial showcase */}
      <section id="approach" className="bg-white border-y border-black/[0.07]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-20 sm:py-28 grid lg:grid-cols-2 gap-12 lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Reveal variant="clip" className="aspect-[4/5] rounded-[2rem] overflow-hidden shadow-[0_40px_80px_-30px_rgba(0,0,0,0.3)] border border-black/5">
              {showcaseImg?<img src={showcaseImg} alt="Property in Kota Kinabalu" className="w-full h-full object-cover"/>:<div className="w-full h-full bg-gradient-to-br from-neutral-200 to-neutral-100"/>}
            </Reveal>
            <Reveal delay={150} className="mt-6">
              <p className="text-xs font-medium uppercase tracking-[0.25em] mb-3" style={{color:GOLDT}}>— The ZERO88 approach</p>
              <h2 className="font-semibold text-neutral-900 tracking-tight" style={{...fontDisplay,fontSize:'clamp(1.75rem,4vw,2.75rem)'}}>Property, done properly.</h2>
            </Reveal>
          </div>
          <div className="space-y-16 sm:space-y-24 lg:py-10">
            {valueProps.map((v,i)=>(
              <Reveal key={i} delay={i*60} className="border-t border-black/10 pt-8">
                <p className="font-semibold mb-4" style={{...fontDisplay,color:GOLD,fontSize:'clamp(2rem,4vw,3rem)'}}>{v.n}</p>
                <h3 className="text-2xl font-semibold text-neutral-900 mb-3" style={fontDisplay}>{v.t}</h3>
                <p className="text-neutral-600 leading-relaxed text-lg">{v.d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Listings */}
      <section id="listings" className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <Reveal className="mb-10">
            <p className="text-xs font-medium uppercase tracking-[0.25em] mb-4" style={{color:GOLDT}}>— Portfolio</p>
            <h2 className="font-semibold text-neutral-900 tracking-tight" style={{...fontDisplay,fontSize:'clamp(2rem,5vw,3.5rem)'}}>Featured properties</h2>
          </Reveal>

          {/* Search & Filter bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-12">
            <div className="flex items-center gap-3 px-5 py-3.5 rounded-full bg-white border border-black/10 flex-1 shadow-sm focus-within:border-neutral-900 transition-colors">
              <span className="text-neutral-400">{Icons.search}</span>
              <input placeholder="Search location, title..." value={search} onChange={(e:ChangeEvent<HTMLInputElement>)=>setSearch(e.target.value)} className="bg-transparent border-0 p-0 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none w-full"/>
            </div>
            <select aria-label="Filter by type" value={filterType} onChange={(e)=>setFilterType(e.target.value)} className="px-5 py-3.5 rounded-full bg-white border border-black/10 text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 cursor-pointer shadow-sm">
              <option value="all">All Types</option>
              {categories.map(c=><option key={c.type} value={c.type}>{c.name}</option>)}
            </select>
            <select aria-label="Sort listings" value={sortBy} onChange={(e)=>setSortBy(e.target.value)} className="px-5 py-3.5 rounded-full bg-white border border-black/10 text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 cursor-pointer shadow-sm">
              <option value="newest">Newest</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="size">Largest</option>
            </select>
            <span className="text-sm text-neutral-400 flex items-center px-2">{filtered.length} results</span>
          </div>

          {loading?(
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3,4,5,6].map(i=><div key={i} className="rounded-2xl bg-white border border-black/[0.07] overflow-hidden animate-pulse"><div className="h-64 bg-neutral-100"/><div className="p-6 space-y-3"><div className="h-5 bg-neutral-100 rounded w-3/4"/><div className="h-4 bg-neutral-100 rounded w-1/2"/><div className="h-3 bg-neutral-100 rounded w-2/3"/></div></div>)}
            </div>
          ):filtered.length===0?(
            <div className="text-center py-24 bg-white rounded-3xl border border-black/[0.07]">
              <svg className="w-20 h-20 mx-auto text-neutral-200 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.75}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21"/></svg>
              <p className="text-neutral-700 text-lg font-medium" style={fontDisplay}>No properties found</p>
              <p className="text-neutral-400 text-sm mt-2">Try adjusting your search or filters</p>
            </div>
          ):(
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((p,idx)=>{
                const imgs=pi(p.images)
                const psf=p.size?Math.round(p.price/parseInt(p.size)):0
                return(
                  <Reveal key={p.id} delay={(idx%3)*90}>
                  <div className="group bg-white rounded-2xl border border-black/[0.07] overflow-hidden hover:shadow-[0_30px_60px_-25px_rgba(0,0,0,0.3)] hover:-translate-y-1.5 transition-all duration-500 cursor-pointer h-full" onClick={()=>setSelected(p)}>
                    <div className="relative h-64 bg-neutral-100 overflow-hidden">
                      <div className="absolute inset-0 transition-transform duration-[1200ms] group-hover:scale-105" style={{transitionTimingFunction:EASE}}><Gallery images={imgs} title={p.title}/></div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent pointer-events-none"/>
                      <div className="absolute top-3 left-3 flex gap-1.5">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold tracking-wide ${p.tenure==='Freehold'?'text-black':'bg-black/50 text-white backdrop-blur-sm'}`} style={p.tenure==='Freehold'?{background:GOLD}:undefined}>{p.tenure}</span>
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/85 text-neutral-800 backdrop-blur-sm">{p.propertyType}</span>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3">
                        <p className="text-2xl font-semibold text-white drop-shadow-lg" style={fontDisplay}>RM {p.price.toLocaleString()}</p>
                        {psf>0&&<p className="text-xs text-white/80">RM {psf.toLocaleString()} psf</p>}
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="text-lg font-semibold text-neutral-900 mb-1.5 line-clamp-1 transition-colors group-hover:text-[#96701A]" style={fontDisplay}>{p.title}</h3>
                      <div className="flex items-center gap-1.5 text-neutral-500 text-sm mb-3">
                        {Icons.location}
                        <span className="truncate">{p.location}{p.state?`, ${p.state}`:''}</span>
                      </div>
                      <p className="text-neutral-500 text-xs line-clamp-2 mb-4 leading-relaxed">{p.description}</p>
                      <div className="flex items-center gap-4 text-sm text-neutral-600 mb-4">
                        <span className="flex items-center gap-1.5" style={{color:GOLDT}}>{Icons.bed}<span className="text-neutral-600">{p.bedrooms}</span></span>
                        <span className="flex items-center gap-1.5" style={{color:GOLDT}}>{Icons.bath}<span className="text-neutral-600">{p.bathrooms}</span></span>
                        <span className="flex items-center gap-1.5" style={{color:GOLDT}}>{Icons.size}<span className="text-neutral-600">{p.size} sqft</span></span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-500 text-[11px] font-medium">{p.furnishing}</span>
                        <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-500 text-[11px] font-medium">{p.lotType}</span>
                        {p.carParks>0&&<span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-500 text-[11px] font-medium">{p.carParks} car</span>}
                      </div>
                      <button onClick={e=>{e.stopPropagation();window.open(waHref(`Hi ${agentName}! I'm interested in "${p.title}" at ${p.location}.`),'_blank')}} className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-[#25D366] hover:bg-[#1ebe5a] text-white font-semibold text-sm transition-all duration-200 active:scale-[0.98]">{Icons.wa} Enquire on WhatsApp</button>
                    </div>
                  </div>
                  </Reveal>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Agent / About */}
      <section id="agent" className="py-20 sm:py-28 bg-white border-t border-black/[0.07]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <Reveal variant="clip">
            <div className="relative">
              <div className="aspect-[4/5] max-w-md rounded-[2rem] overflow-hidden border border-black/5 shadow-xl bg-gradient-to-br from-neutral-100 to-neutral-200">
                {profilePic?<img src={profilePic} alt={agentName} className="w-full h-full object-cover"/>:(
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-8">
                    <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-black text-4xl font-bold mb-5" style={{background:GOLD,...fontDisplay}}>{agentName[0]?.toUpperCase()}</div>
                    <p className="text-neutral-900 text-xl font-semibold" style={fontDisplay}>{agentName}</p>
                    <p className="text-sm mt-1" style={{color:GOLDT}}>{BRAND.jobTitle}</p>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-5 -right-2 sm:right-6 bg-white shadow-xl border border-black/5 rounded-2xl px-5 py-3">
                <p className="text-[10px] text-neutral-400 uppercase tracking-[0.2em]">Licensed</p>
                <p className="font-semibold" style={{...fontDisplay,color:GOLDT}}>{ren}</p>
              </div>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <p className="text-xs font-medium uppercase tracking-[0.25em] mb-4" style={{color:GOLDT}}>— Your negotiator</p>
            <h2 className="font-semibold text-neutral-900 tracking-tight mb-2" style={{...fontDisplay,fontSize:'clamp(2rem,5vw,3.25rem)'}}>{agentName}</h2>
            <p className="text-neutral-500 mb-6">{BRAND.jobTitle} · {company} <span className="text-neutral-300">·</span> {BRAND.companyCn}</p>
            <p className="text-neutral-700 leading-relaxed mb-8 max-w-xl text-lg">{bio}</p>

            <div className="space-y-5 mb-9">
              <div>
                <p className="text-[10px] text-neutral-400 uppercase tracking-[0.2em] mb-2">Specialities</p>
                <div className="flex flex-wrap gap-2">{specialities.map((s,i)=><span key={i} className="px-3 py-1.5 rounded-full bg-neutral-50 border border-black/[0.07] text-sm text-neutral-700">{s}</span>)}</div>
              </div>
              <div>
                <p className="text-[10px] text-neutral-400 uppercase tracking-[0.2em] mb-2">Languages</p>
                <div className="flex flex-wrap gap-2">{languages.map((s,i)=><span key={i} className="px-3 py-1.5 rounded-full bg-neutral-50 border border-black/[0.07] text-sm text-neutral-700">{s}</span>)}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <a href={waHref(`Hi ${agentName}! I'd like to ask about a property.`)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 bg-[#25D366] hover:bg-[#1ebe5a] text-white font-semibold px-6 py-3.5 rounded-full transition-all active:scale-[0.97]">{Icons.wa} WhatsApp</a>
              <a href={`mailto:${email}`} className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-neutral-300 text-neutral-800 font-semibold hover:border-neutral-900 transition-all">Email</a>
              <a href={BRAND.facebook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-neutral-300 text-neutral-800 font-semibold hover:border-neutral-900 transition-all">Facebook</a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA band */}
      <section className="relative py-24 sm:py-36 overflow-hidden bg-neutral-950 text-white">
        <div className="absolute inset-0" style={{background:`radial-gradient(circle at center, rgba(226,169,59,0.18), transparent 60%)`}}/>
        <div className="relative max-w-4xl mx-auto px-6 sm:px-8 text-center">
          <Reveal>
            <h2 className="font-semibold tracking-tight mb-6" style={{...fontDisplay,fontSize:'clamp(2.25rem,6vw,4.5rem)'}}>Let&apos;s find your<br/><span className="italic" style={{color:GOLD}}>next address.</span></h2>
            <p className="text-neutral-400 text-lg mb-10 max-w-xl mx-auto">Tell me what you&apos;re looking for — whether buying, selling or renting in {BRAND.region}. I&apos;ll do the legwork.</p>
            <a href={waHref(`Hi ${agentName}! I'm looking for a property. Can you help me?`)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 bg-[#25D366] hover:bg-[#1ebe5a] text-white font-semibold px-10 py-4 rounded-full transition-all duration-200 shadow-[0_10px_40px_-12px_rgba(37,211,102,0.7)] active:scale-[0.97]">{Icons.wa} Chat on WhatsApp</a>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#FBFAF8] border-t border-black/[0.07]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-14">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            <div className="lg:col-span-2">
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-2xl font-bold tracking-[0.2em] text-neutral-900" style={fontDisplay}>ZERO<span style={{color:GOLD}}>88</span></span>
                <span className="text-[10px] tracking-[0.3em] text-neutral-400 uppercase">Property · {BRAND.companyCn}</span>
              </div>
              <p className="text-neutral-500 text-sm max-w-sm leading-relaxed">{tagline}. Helping clients buy, sell and rent property across {BRAND.region}.</p>
            </div>
            <div>
              <p className="text-[10px] text-neutral-400 uppercase tracking-[0.2em] mb-4">Contact</p>
              <ul className="space-y-2.5 text-sm text-neutral-600">
                <li><a href={waHref('Hi! I found your property page.')} target="_blank" rel="noopener noreferrer" className="hover:text-[#96701A] transition-colors">{BRAND.phoneDisplay}</a></li>
                <li><a href={`mailto:${email}`} className="hover:text-[#96701A] transition-colors break-all">{email}</a></li>
                <li><a href={BRAND.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-[#96701A] transition-colors">Facebook</a></li>
              </ul>
            </div>
            <div>
              <p className="text-[10px] text-neutral-400 uppercase tracking-[0.2em] mb-4">Agent</p>
              <ul className="space-y-2.5 text-sm text-neutral-600">
                <li className="text-neutral-900 font-medium">{agentName}</li>
                <li>{BRAND.jobTitle}</li>
                <li style={{color:GOLDT}}>{ren}</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-black/[0.07] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400">
            <p>© {new Date().getFullYear()} {company}. All rights reserved.</p>
            <p>{BRAND.region}, {BRAND.country}</p>
          </div>
        </div>
      </footer>

      {selected&&<DetailModal p={selected} phone={ph} agentName={agentName} onClose={()=>setSelected(null)}/>}
    </div>
  )
}
