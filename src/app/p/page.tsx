'use client'

import { useEffect, useState, useRef, ChangeEvent, ReactNode } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { BRAND } from '@/lib/brand'

// 3D hero centerpiece — client-only (WebGL)
const ThreeScene = dynamic(() => import('./ThreeScene'), { ssr: false })

// Decorative stock photos used when a listing has no image / page is empty
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=80',
]

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

const GOLD = '#E2A93B'   // fills, lines, icons, badges
const GOLDT = '#8A6512'  // gold text on light glass (AA contrast)
const fontDisplay = { fontFamily: 'var(--font-display, Georgia, serif)' }
const fontBody = { fontFamily: 'var(--font-body, system-ui, sans-serif)' }
const EASE = 'cubic-bezier(0.16,1,0.3,1)'
// Frosted-glass surface used throughout
const glass = 'bg-white/40 backdrop-blur-xl border border-white/60 shadow-[0_10px_50px_-15px_rgba(80,60,15,0.28)]'
const glassSoft = 'bg-white/30 backdrop-blur-md border border-white/50'

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
  chat: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"/></svg>,
  compass: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z"/><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5-1.5-1.5 4.5-4.5 1.5 1.5-4.5z"/></svg>,
  key: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"/></svg>,
  check: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>,
  // Modal detail icons
  tenure: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg>,
  furnish: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"/></svg>,
  lot: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"/></svg>,
  land: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"/></svg>,
  features: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/></svg>,
  desc: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>,
  price: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  status: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  type: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6H15m-1.5 3H15m-1.5 3H15M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12l9-3L12 3 3 0z"/></svg>,
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
    // threshold must be 0: the 'clip' variant self-clips to inset(0 0 100%),
    // which the browser measures as ratio 0 — any positive threshold would
    // deadlock and the element would never reveal.
    }, { threshold: 0, rootMargin: '0px 0px -12% 0px' })
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

// Headline with word-by-word mask-up reveal. Animates on mount.
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
  return <p ref={ref} className="font-semibold tracking-tight" style={{ ...fontDisplay, color: GOLDT, fontSize: 'clamp(2.75rem,5.5vw,4.5rem)' }}>{val}</p>
}

function Gallery({ images, title }: { images: string[]; title: string }) {
  const [cur, setCur] = useState(0)
  if (!images.length) return <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200"><svg className="w-16 h-16 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.75}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21"/></svg></div>
  return (
    <div className="relative w-full h-full group/g">
      {images.map((s,i)=><img key={i} src={s} alt={`${title} photo ${i+1}`} className={`absolute inset-0 w-full h-full object-cover transition-all duration-[900ms] ${i===cur?'opacity-100 scale-100':'opacity-0 scale-105'}`} style={{transitionTimingFunction:EASE}} loading="lazy"/>)}
      {images.length>1&&(<>
        <button aria-label="Previous photo" onClick={(e)=>{e.stopPropagation();setCur(p=>p===0?images.length-1:p-1)}} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/70 backdrop-blur-md flex items-center justify-center opacity-0 group-hover/g:opacity-100 transition-all text-neutral-800 hover:bg-white shadow-md border border-white/60">{Icons.chevronLeft}</button>
        <button aria-label="Next photo" onClick={(e)=>{e.stopPropagation();setCur(p=>p===images.length-1?0:p+1)}} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/70 backdrop-blur-md flex items-center justify-center opacity-0 group-hover/g:opacity-100 transition-all text-neutral-800 hover:bg-white shadow-md border border-white/60">{Icons.chevronRight}</button>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">{images.map((_:any,i:number)=><button aria-label={`Go to photo ${i+1}`} key={i} onClick={(e)=>{e.stopPropagation();setCur(i)}} className={`h-1 rounded-full transition-all duration-300 ${i===cur?'bg-white w-6':'bg-white/60 w-3 hover:bg-white'}`}/>)}</div>
      </>)}
    </div>
  )
}

// Chapter eyebrow label
function Chapter({ no, label }: { no: string; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="font-semibold" style={{ ...fontDisplay, color: GOLD }}>{no}</span>
      <span className="h-px w-10" style={{ background: GOLD }} />
      <span className="text-[11px] font-medium uppercase tracking-[0.3em] text-neutral-500">{label}</span>
    </div>
  )
}

// What the guide says at each chapter of the scroll story
const GUIDE_LINES: Record<string, string> = {
  story: 'Hi, I’m Jackson \u{1F44B} Let me walk you through how we find your home.',
  numbers: 'These are my live listings — real numbers, nothing inflated.',
  browse: 'Condo? Landed? Studio? Pick what suits your life.',
  listings: 'My current handpicked homes — tap any card for the full story.',
  agent: 'That’s me! Licensed negotiator, born and based in Sabah.',
  services: 'Buying, selling, renting — I handle everything in between.',
  faq: 'The questions everyone asks me, answered honestly.',
  contact: 'Ready when you are — one WhatsApp message starts it all.',
}

// Floating tour guide — the hero character pops up and introduces each section
function GuideAvatar({ active }: { active: string }) {
  const [dismissed, setDismissed] = useState(false)
  const line = GUIDE_LINES[active]
  const show = !dismissed && !!line
  return (
    <div
      aria-hidden={!show}
      className={`fixed left-4 sm:left-6 bottom-4 sm:bottom-6 z-[75] flex items-end gap-2.5 transition-all duration-500 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'}`}
      style={{ transitionTimingFunction: EASE }}
    >
      <div
        className="z-anim flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 shadow-[0_8px_25px_-6px_rgba(80,60,15,0.5)] bg-neutral-900"
        style={{
          borderColor: GOLD,
          backgroundImage: 'url(/hero-banner.jpg)',
          backgroundSize: '520% auto',
          backgroundPosition: '23.5% 2%',
          animation: 'zguidebob 3.2s ease-in-out infinite',
        }}
      />
      <div className={`relative max-w-[230px] sm:max-w-[300px] rounded-2xl rounded-bl-md px-4 py-3 ${glass}`}>
        <button
          aria-label="Hide guide"
          onClick={() => setDismissed(true)}
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-neutral-800 text-white text-[10px] leading-none flex items-center justify-center hover:bg-neutral-600 transition-colors"
        >
          ✕
        </button>
        <p key={active} className="z-anim text-[13px] sm:text-sm leading-snug text-neutral-800" style={{ animation: 'zguidepop 0.45s ' + EASE }}>
          {line}
        </p>
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
  const [sortBy,setSortBy]=useState('newest')
  const [filterCategory,setFilterCategory]=useState<'all'|'Rent'|'Buy'>('all')
  const [progress,setProgress]=useState(0)
  const [scrolled,setScrolled]=useState(false)
  const [active,setActive]=useState('top')

  useEffect(()=>{
    Promise.all([fetch('/api/properties').then(r=>r.json()),fetch('/api/agent').then(r=>r.json())]).then(([props,agentData])=>{
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
      })
    }
    onScroll()
    window.addEventListener('scroll',onScroll,{passive:true})
    return ()=>{window.removeEventListener('scroll',onScroll);if(raf)cancelAnimationFrame(raf)}
  },[])

  // Track active chapter for the side nav
  useEffect(()=>{
    const secs=Array.from(document.querySelectorAll('[data-scene]'))
    if(!secs.length)return
    const io=new IntersectionObserver((entries)=>{
      entries.forEach(e=>{if(e.isIntersecting)setActive((e.target as HTMLElement).id)})
    },{threshold:0.5})
    secs.forEach(s=>io.observe(s))
    return ()=>io.disconnect()
  },[loading])

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
    const mc=filterCategory==='all'||p.purpose===filterCategory
    return ms&&mt&&mc
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

  const waHref=(msg:string)=>`https://wa.me/${ph}?text=${encodeURIComponent(msg)}`

  const story=[
    {icon:Icons.chat,t:'It starts with a hello',d:'Message me on WhatsApp. Tell me your budget, your area, your dream — no forms, no pressure.'},
    {icon:Icons.compass,t:'I learn what you need',d:'I listen, ask the right questions, and read the Sabah market so we search with intent.'},
    {icon:Icons.home,t:'I curate the options',d:'Handpicked listings that actually fit — with honest pros and cons for each one.'},
    {icon:Icons.key,t:'We view, and you move in',d:'Viewings, negotiation, paperwork and handover — I walk every step beside you.'},
  ]

  const chapters:[string,string,string][]=[
    ['top','01','Welcome'],['story','02','The Search'],['numbers','03','Trust'],
    ['browse','04','Types'],['listings','05','Homes'],['agent','06','Your Guide'],
    ['services','07','Services'],['faq','08','FAQ'],['contact','09','Begin'],
  ]

  return(
    <div className="relative min-h-dvh text-neutral-900 selection:bg-[#E2A93B] selection:text-black antialiased overflow-clip" style={fontBody}>
      <style>{`
        html{scroll-behavior:smooth;scroll-padding-top:5rem}
        @media (min-width:1024px){html{scroll-snap-type:y proximity}}
        @keyframes zfloatA{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(6vw,-4vw) scale(1.15)}}
        @keyframes zfloatB{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-7vw,5vw) scale(1.2)}}
        @keyframes zfloatC{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(5vw,6vw) scale(1.1)}}
        @keyframes zmarquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes zguidebob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes zguidepop{0%{opacity:0;transform:translateY(6px) scale(0.97)}100%{opacity:1;transform:translateY(0) scale(1)}}
        @media (prefers-reduced-motion: reduce){html{scroll-behavior:auto;scroll-snap-type:none}.z-anim{animation:none!important}}
      `}</style>

      {/* Solid base background */}
      <div className="fixed inset-0 -z-20 bg-[#FAF7F0]"/>

      {/* Animated aurora background (sits behind everything) */}
      <div className="fixed inset-0 -z-15 overflow-hidden pointer-events-none">
        <div className="z-anim absolute -top-[10%] -left-[5%] w-[55vw] h-[55vw] rounded-full blur-[110px] opacity-60" style={{background:'radial-gradient(circle, #F3D58C, transparent 70%)',animation:'zfloatA 22s ease-in-out infinite'}}/>
        <div className="z-anim absolute top-[30%] right-[-10%] w-[50vw] h-[50vw] rounded-full blur-[120px] opacity-50" style={{background:'radial-gradient(circle, #E2A93B, transparent 70%)',animation:'zfloatB 26s ease-in-out infinite'}}/>
        <div className="z-anim absolute bottom-[-15%] left-[20%] w-[45vw] h-[45vw] rounded-full blur-[120px] opacity-40" style={{background:'radial-gradient(circle, #EAD9BC, transparent 70%)',animation:'zfloatC 30s ease-in-out infinite'}}/>
      </div>

      {/* 3D property city (WebGL) — sits above aurora */}
      <div className="fixed inset-0 -z-10 pointer-events-none opacity-40"><ThreeScene/></div>

      {/* Scroll progress */}
      <div className="fixed top-0 left-0 right-0 h-[2px] z-[90] bg-transparent">
        <div className="h-full origin-left" style={{background:`linear-gradient(90deg, ${GOLD}, #F5D27A)`,transform:`scaleX(${progress})`}}/>
      </div>

      {/* Chapter side nav */}
      <nav className="fixed right-5 top-1/2 -translate-y-1/2 z-[70] hidden lg:flex flex-col gap-3.5" aria-label="Chapters">
        {chapters.map(([id,no,label])=>(
          <a key={id} href={`#${id}`} className="group flex items-center gap-3 justify-end">
            <span className={`text-[10px] font-semibold uppercase tracking-[0.15em] px-2.5 py-1 rounded-full transition-all duration-300 ${glass} ${active===id?'opacity-100 translate-x-0':'opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}`}>{no} · {label}</span>
            <span className="w-2.5 h-2.5 rounded-full border transition-all duration-300" style={active===id?{background:GOLD,borderColor:GOLD,transform:'scale(1.3)'}:{borderColor:'rgba(0,0,0,0.25)',background:'rgba(255,255,255,0.6)'}}/>
          </a>
        ))}
      </nav>

      {/* Top nav */}
      <header className={`fixed top-0 inset-x-0 z-[80] transition-all duration-500 ${scrolled?'py-2.5':'py-4'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className={`flex items-center justify-between rounded-full px-5 sm:px-6 h-14 transition-all duration-500 ${scrolled?glass:'bg-transparent border border-transparent'}`}>
            <a href="#top" className="flex items-baseline gap-2">
              <span className="text-xl font-bold tracking-[0.2em] text-white" style={fontDisplay}>ZERO<span style={{color:GOLD}}>88</span></span>
              <span className="hidden sm:inline text-[10px] tracking-[0.3em] text-white/60 uppercase">Property</span>
            </a>
            <nav className="hidden md:flex items-center gap-7 text-sm text-neutral-600">
              <a href="#story" className="hover:text-neutral-900 transition-colors">Story</a>
              <a href="#browse" className="hover:text-neutral-900 transition-colors">Browse</a>
              <a href="#listings" className="hover:text-neutral-900 transition-colors">Listings</a>
              <a href="#agent" className="hover:text-neutral-900 transition-colors">About</a>
            </nav>
            <a href={waHref(`Hi ${agentName}! I found your property page and would like to know more.`)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold px-4 sm:px-5 py-2.5 rounded-full bg-[#25D366] hover:bg-[#1ebe5a] text-white transition-all active:scale-95 shadow-[0_4px_15px_-3px_rgba(37,211,102,0.5)]">
              {Icons.wa}<span className="hidden sm:inline">WhatsApp</span><span className="sm:hidden">Chat</span>
            </a>
          </div>
        </div>
      </header>

      {/* ===== SCENE 01 — HERO ===== */}
      {/* ===== SCENE 01 — HERO ===== */}
      <section id="top" data-scene className="snap-start relative min-h-dvh overflow-hidden">
        {/* Full-bleed hero image */}
        <div className="absolute inset-0">
          <img
            src="/hero-banner.jpg"
            alt="Jackson Liew - ZERO88 Property"
            className="w-full h-full object-cover [object-position:20%_top] sm:object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"/>
        </div>

        {/* Bottom CTA bar */}
        <div className="absolute bottom-0 inset-x-0 z-10 pb-4 pt-3 px-5 sm:px-8">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-end justify-between gap-2 sm:gap-4">
            <div>
              <Reveal>
                <h2 className="text-white text-xl sm:text-3xl font-semibold mb-1" style={fontDisplay}>Let&apos;s find your perfect home</h2>
                <p className="text-white/70 text-xs sm:text-base max-w-md">Buy, sell or rent in {BRAND.region} with {agentName}.</p>
              </Reveal>
            </div>
            <Reveal delay={200}>
              <a href="#listings" className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-white text-sm hover:text-white/90 transition-all duration-200 bg-white/15 backdrop-blur-md border border-white/20`}>
                Browse Properties {Icons.arrow}
              </a>
            </Reveal>
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden sm:flex flex-col items-center gap-2 text-white/50 z-10">
          <span className="text-[10px] font-medium uppercase tracking-[0.3em]">Scroll</span>
          <div className="w-5 h-8 rounded-full border border-white/30 flex justify-center pt-1.5">
            <div className="w-1 h-2 rounded-full animate-bounce bg-white/60"/>
          </div>
        </div>
      </section>

      {/* marquee */}
      <div className="relative overflow-hidden py-5 border-y border-white/50 bg-white/20 backdrop-blur-sm">
        <div className="z-anim flex w-max gap-12 whitespace-nowrap" style={{animation:'zmarquee 30s linear infinite'}}>
          {Array.from({length:2}).map((_,r)=>(
            <div key={r} className="flex items-center gap-12">
              {['Buy','Sell','Rent','Kota Kinabalu','Sabah','Residential','Commercial','Trusted Negotiator'].map((t,i)=>(
                <span key={i} className="flex items-center gap-12 text-2xl sm:text-3xl font-medium text-neutral-400" style={fontDisplay}>{t}<span className="text-lg" style={{color:GOLD}}>✦</span></span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ===== SCENE 02 — STORY ===== */}
      <section id="story" data-scene className="snap-start relative min-h-dvh flex flex-col justify-center py-24">
        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 w-full">
          <Reveal className="max-w-2xl mb-14">
            <Chapter no="02" label="The Search"/>
            <h2 className="font-semibold text-neutral-900 tracking-tight" style={{...fontDisplay,fontSize:'clamp(2rem,5vw,3.75rem)'}}>It starts with a conversation.</h2>
            <p className="text-neutral-600 text-lg mt-5">Buying or renting a home shouldn&apos;t feel like a transaction. Here&apos;s how we do it together.</p>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {story.map((s,i)=>(
              <Reveal key={i} delay={i*110} variant="up">
                <div className={`group h-full rounded-3xl p-7 transition-all duration-500 hover:-translate-y-2 ${glass} hover:bg-white/55`}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-black transition-transform duration-500 group-hover:scale-110" style={{background:GOLD}}>{s.icon}</div>
                  <p className="text-xs font-semibold mb-2" style={{color:GOLDT}}>STEP {i+1}</p>
                  <h3 className="text-xl font-semibold text-neutral-900 mb-2.5" style={fontDisplay}>{s.t}</h3>
                  <p className="text-neutral-600 text-sm leading-relaxed">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SCENE 03 — NUMBERS ===== */}
      <section id="numbers" data-scene className="snap-start relative min-h-dvh flex flex-col justify-center py-24">
        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 w-full">
          <Reveal className="text-center max-w-2xl mx-auto mb-14">
            <div className="flex justify-center"><Chapter no="03" label="Trust"/></div>
            <h2 className="font-semibold text-neutral-900 tracking-tight" style={{...fontDisplay,fontSize:'clamp(2rem,5vw,3.75rem)'}}>Backed by the numbers.</h2>
          </Reveal>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[{v:stats.total,l:'Properties'},{v:stats.rent,l:'For Rent'},{v:stats.buy,l:'For Sale'},{v:stats.freehold,l:'Freehold'}].map((s,i)=>(
              <Reveal key={i} delay={i*100} variant="scale">
                <div className={`rounded-3xl p-8 text-center ${glass}`}>
                  <StatNum value={s.v}/>
                  <p className="text-[11px] text-neutral-500 mt-3 font-medium uppercase tracking-[0.2em]">{s.l}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SCENE 04 — BROWSE ===== */}
      <section id="browse" data-scene className="snap-start relative min-h-dvh flex flex-col justify-center py-24">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 w-full">
          <Reveal className="mb-14">
            <Chapter no="04" label="Types"/>
            <h2 className="font-semibold text-neutral-900 tracking-tight" style={{...fontDisplay,fontSize:'clamp(2rem,5vw,3.75rem)'}}>Find your kind of place.</h2>
          </Reveal>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {categories.map((cat,i)=>(
              <Reveal key={i} delay={i*90} variant="scale">
                <button onClick={()=>{setFilterType(cat.type===filterType?'all':cat.type);document.getElementById('listings')?.scrollIntoView({behavior:'smooth'})}} className={`group w-full p-7 rounded-3xl text-left transition-all duration-300 hover:-translate-y-2 ${filterType===cat.type?'text-black shadow-lg':`${glass} hover:bg-white/55 text-neutral-700`}`} style={filterType===cat.type?{background:GOLD}:undefined}>
                  <div className="mb-8 transition-transform duration-500 group-hover:scale-110" style={{color:filterType===cat.type?'#1a1a1a':GOLDT}}>{cat.icon}</div>
                  <p className="font-semibold text-lg" style={fontDisplay}>{cat.name}</p>
                  <p className={`text-sm mt-1 ${filterType===cat.type?'text-black/70':'text-neutral-500'}`}>{cat.count} listings</p>
                </button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SCENE 05 — LISTINGS ===== */}
      <section id="listings" data-scene className="relative py-24">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <Reveal className="mb-10">
            <Chapter no="05" label="Homes"/>
            <h2 className="font-semibold text-neutral-900 tracking-tight" style={{...fontDisplay,fontSize:'clamp(2rem,5vw,3.75rem)'}}>Handpicked spaces.</h2>
          </Reveal>

          <div className={`flex flex-col gap-4 mb-14`}>
            {/* Rent / Buy Toggle */}
            <div className={`flex p-1.5 rounded-2xl ${glass} self-start`}>
              {([['all','All'],['Rent','Rent'],['Buy','Buy']] as const).map(([key,label])=>(
                <button key={key} onClick={()=>setFilterCategory(key)} className={`px-7 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${filterCategory===key?'bg-[#E2A93B] text-black shadow-lg':'text-neutral-600 hover:text-neutral-900'}`}>
                  {label}
                </button>
              ))}
            </div>
            {/* Search + Filters */}
            <div className={`flex flex-col sm:flex-row gap-3 p-3 rounded-3xl ${glass}`}>
            <div className="flex items-center gap-3 px-5 py-3.5 rounded-full bg-white/60 border border-white/60 flex-1 focus-within:border-neutral-400 transition-colors">
              <span className="text-neutral-400">{Icons.search}</span>
              <input placeholder="Search location, title..." value={search} onChange={(e:ChangeEvent<HTMLInputElement>)=>setSearch(e.target.value)} className="bg-transparent border-0 p-0 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none w-full"/>
            </div>
            <select aria-label="Filter by type" value={filterType} onChange={(e)=>setFilterType(e.target.value)} className="px-5 py-3.5 rounded-full bg-white/60 border border-white/60 text-sm text-neutral-900 focus:outline-none cursor-pointer">
              <option value="all">All Types</option>
              {categories.map(c=><option key={c.type} value={c.type}>{c.name}</option>)}
            </select>
            <select aria-label="Sort listings" value={sortBy} onChange={(e)=>setSortBy(e.target.value)} className="px-5 py-3.5 rounded-full bg-white/60 border border-white/60 text-sm text-neutral-900 focus:outline-none cursor-pointer">
              <option value="newest">Newest</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="size">Largest</option>
            </select>
            <span className="text-sm text-neutral-500 flex items-center px-3">{filtered.length} results</span>
            </div>
          </div>

          {loading?(
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1,2,3,4,5,6].map(i=><div key={i} className={`rounded-3xl overflow-hidden animate-pulse ${glass}`}><div className="h-64 bg-white/40"/><div className="p-6 space-y-3"><div className="h-5 bg-white/50 rounded w-3/4"/><div className="h-4 bg-white/50 rounded w-1/2"/><div className="h-3 bg-white/50 rounded w-2/3"/></div></div>)}
            </div>
          ):filtered.length===0?(
            <div className={`text-center py-24 rounded-3xl ${glass}`}>
              <svg className="w-20 h-20 mx-auto text-neutral-300 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.75}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21"/></svg>
              <p className="text-neutral-700 text-lg font-medium" style={fontDisplay}>No properties found</p>
              <p className="text-neutral-500 text-sm mt-2">Try adjusting your search or filters</p>
            </div>
          ):(
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((p,idx)=>{
                const imgs=pi(p.images)
                const psf=p.size?Math.round(p.price/parseInt(p.size)):0
                return(
                  <Reveal key={p.id} delay={(idx%3)*90}>
                  <Link href={`/p/${p.id}`} className={`group block rounded-3xl overflow-hidden hover:-translate-y-2 transition-all duration-500 h-full ${glass} hover:bg-white/55 hover:shadow-[0_30px_70px_-25px_rgba(80,60,15,0.45)]`}>
                    <div className="relative h-64 bg-neutral-100 overflow-hidden m-2 rounded-2xl">
                      <div className="absolute inset-0 transition-transform duration-[1200ms] group-hover:scale-105" style={{transitionTimingFunction:EASE}}><Gallery images={imgs} title={p.title}/></div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent pointer-events-none"/>
                      <div className="absolute top-3 left-3 flex gap-1.5">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold tracking-wide ${p.tenure==='Freehold'?'text-black':'bg-black/50 text-white backdrop-blur-sm'}`} style={p.tenure==='Freehold'?{background:GOLD}:undefined}>{p.tenure}</span>
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/85 text-neutral-800 backdrop-blur-sm">{p.propertyType}</span>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3">
                        <p className="text-2xl font-semibold text-white drop-shadow-lg" style={fontDisplay}>RM {p.price.toLocaleString()}</p>
                        {psf>0&&<p className="text-xs text-white/85">RM {psf.toLocaleString()} psf</p>}
                      </div>
                    </div>
                    <div className="px-5 pb-5 pt-2">
                      <h3 className="text-lg font-semibold text-neutral-900 mb-1.5 line-clamp-1 transition-colors group-hover:text-[#8A6512]" style={fontDisplay}>{p.title}</h3>
                      <div className="flex items-center gap-1.5 text-neutral-500 text-sm mb-3">{Icons.location}<span className="truncate">{p.location}{p.state?`, ${p.state}`:''}</span></div>
                      <p className="text-neutral-500 text-xs line-clamp-2 mb-4 leading-relaxed">{p.description}</p>
                      <div className="flex items-center gap-4 text-sm text-neutral-600 mb-4">
                        <span className="flex items-center gap-1.5" style={{color:GOLDT}}>{Icons.bed}<span className="text-neutral-600">{p.bedrooms}</span></span>
                        <span className="flex items-center gap-1.5" style={{color:GOLDT}}>{Icons.bath}<span className="text-neutral-600">{p.bathrooms}</span></span>
                        <span className="flex items-center gap-1.5" style={{color:GOLDT}}>{Icons.size}<span className="text-neutral-600">{p.size} sqft</span></span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        <span className="px-2 py-0.5 rounded-md bg-white/60 text-neutral-500 text-[11px] font-medium border border-white/60">{p.furnishing}</span>
                        <span className="px-2 py-0.5 rounded-md bg-white/60 text-neutral-500 text-[11px] font-medium border border-white/60">{p.lotType}</span>
                        {p.carParks>0&&<span className="px-2 py-0.5 rounded-md bg-white/60 text-neutral-500 text-[11px] font-medium border border-white/60">{p.carParks} car</span>}
                      </div>
                      <button onClick={e=>{e.preventDefault();e.stopPropagation();window.open(waHref(`Hi ${agentName}! I'm interested in "${p.title}" at ${p.location}.`),'_blank')}} className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-[#25D366] hover:bg-[#1ebe5a] text-white font-semibold text-sm transition-all duration-200 active:scale-[0.98]">{Icons.wa} Enquire on WhatsApp</button>
                    </div>
                  </Link>
                  </Reveal>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* ===== SCENE 06 — AGENT ===== */}
      <section id="agent" data-scene className="snap-start relative min-h-dvh flex flex-col justify-center py-24">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <Reveal variant="clip">
            <div className="relative pb-8">
              <div className="aspect-[4/5] max-w-md rounded-[2rem] overflow-hidden border border-white/60 shadow-xl bg-gradient-to-br from-[#F3D58C] to-[#EAD9BC]">
                {profilePic?<img src={profilePic} alt={agentName} className="w-full h-full object-cover"/>:(
                  <div className="relative w-full h-full flex flex-col items-center justify-center text-center p-8">
                    <img src={FALLBACK_IMAGES[3]} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25"/>
                    <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-white/40 to-white/20"/>
                    <div className="relative w-24 h-24 rounded-2xl flex items-center justify-center text-black text-4xl font-bold mb-5 shadow-lg" style={{background:GOLD,...fontDisplay}}>{agentName[0]?.toUpperCase()}</div>
                    <p className="relative text-neutral-900 text-xl font-semibold" style={fontDisplay}>{agentName}</p>
                    <p className="relative text-sm mt-1" style={{color:GOLDT}}>{BRAND.jobTitle}</p>
                  </div>
                )}
              </div>
              <div className={`absolute bottom-2 -right-2 sm:right-4 rounded-2xl px-5 py-3 ${glass} z-10`}>
                <p className="text-[10px] text-neutral-500 uppercase tracking-[0.2em]">Licensed</p>
                <p className="font-semibold" style={{...fontDisplay,color:GOLDT}}>{ren}</p>
              </div>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <Chapter no="06" label="Your Guide"/>
            <h2 className="font-semibold text-neutral-900 tracking-tight mb-2" style={{...fontDisplay,fontSize:'clamp(2rem,5vw,3.25rem)'}}>{agentName}</h2>
            <p className="text-neutral-500 mb-6">{BRAND.jobTitle} · {company} <span className="text-neutral-300">·</span> {BRAND.companyCn}</p>
            <p className="text-neutral-700 leading-relaxed mb-8 max-w-xl text-lg">{bio}</p>
            <div className="space-y-5 mb-9">
              <div>
                <p className="text-[10px] text-neutral-400 uppercase tracking-[0.2em] mb-2">Specialities</p>
                <div className="flex flex-wrap gap-2">{specialities.map((s,i)=><span key={i} className={`px-3 py-1.5 rounded-full text-sm text-neutral-700 ${glassSoft}`}>{s}</span>)}</div>
              </div>
              <div>
                <p className="text-[10px] text-neutral-400 uppercase tracking-[0.2em] mb-2">Languages</p>
                <div className="flex flex-wrap gap-2">{languages.map((s,i)=><span key={i} className={`px-3 py-1.5 rounded-full text-sm text-neutral-700 ${glassSoft}`}>{s}</span>)}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href={waHref(`Hi ${agentName}! I'd like to ask about a property.`)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 bg-[#25D366] hover:bg-[#1ebe5a] text-white font-semibold px-6 py-3.5 rounded-full transition-all active:scale-[0.97]">{Icons.wa} WhatsApp</a>
              <a href={`mailto:${email}`} className={`inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-semibold text-neutral-800 hover:text-neutral-900 transition-all ${glass}`}>Email</a>
              <a href={BRAND.facebook} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-semibold text-neutral-800 hover:text-neutral-900 transition-all ${glass}`}>Facebook</a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== SCENE 07 — SERVICES ===== */}
      <section id="services" data-scene className="relative py-24">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 w-full">
          <Reveal className="text-center max-w-2xl mx-auto mb-14">
            <Chapter no="07" label="Services"/>
            <h2 className="font-semibold text-neutral-900 tracking-tight" style={{...fontDisplay,fontSize:'clamp(2rem,5vw,3.75rem)'}}>What we offer.</h2>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {icon:Icons.home,title:'Residential Sales',desc:'Buy your dream home from our curated selection of houses, condos, and semi-Ds across Sabah.'},
              {icon:Icons.building,title:'Commercial Properties',desc:'Office spaces, retail lots, and shophouses in prime locations for your business growth.'},
              {icon:Icons.key,title:'Rental Services',desc:'Find the perfect rental property — from studio apartments to family homes, fully managed.'},
              {icon:Icons.chat,title:'Free Consultation',desc:'Not sure where to start? Talk to us for honest advice on the property market and your options.'},
              {icon:Icons.compass,title:'Market Guidance',desc:'We provide data-driven insights on pricing, trends, and the best areas to invest in Sabah.'},
              {icon:Icons.check,title:'Full Support',desc:'From viewing to paperwork to handover — we handle the entire process so you don\'t have to.'},
            ].map((s,i)=>(
              <Reveal key={i} delay={i*80} variant="up">
                <div className={`group h-full rounded-3xl p-7 transition-all duration-500 hover:-translate-y-2 ${glass} hover:bg-white/55`}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 text-black transition-transform duration-500 group-hover:scale-110" style={{background:GOLD}}>{s.icon}</div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2" style={fontDisplay}>{s.title}</h3>
                  <p className="text-neutral-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SCENE 08 — FAQ ===== */}
      <section id="faq" data-scene className="relative py-24">
        <div className="max-w-3xl mx-auto px-6 sm:px-8 w-full">
          <Reveal className="text-center mb-14">
            <Chapter no="08" label="FAQ"/>
            <h2 className="font-semibold text-neutral-900 tracking-tight" style={{...fontDisplay,fontSize:'clamp(2rem,5vw,3.75rem)'}}>Common questions.</h2>
          </Reveal>
          <div className="space-y-4">
            {[
              {q:'How do I start looking for a property?',a:'Simply message us on WhatsApp or browse our listings above. We\'ll understand your needs and find the best options for you.'},
              {q:'What areas do you cover?',a:'We cover Kota Kinabalu, Penampang, Menggatal, Inanam, Sepanggar, and greater Sabah. Contact us for specific areas.'},
              {q:'Do I need to pay for your services?',a:'For buyers and tenants, our consultation is free. We earn from the property transaction, so our service costs you nothing extra.'},
              {q:'Can I schedule a property viewing?',a:'Yes! Just send us a WhatsApp message with the property you\'re interested in and we\'ll arrange a viewing at your convenience.'},
              {q:'What documents do I need for buying?',a:'Generally: IC/passport, proof of income, and bank statements. We\'ll guide you through the exact requirements for your situation.'},
            ].map((f,i)=>(
              <Reveal key={i} delay={i*80}>
                <div className={`rounded-2xl p-6 ${glass}`}>
                  <h4 className="font-semibold text-neutral-900 mb-2" style={fontDisplay}>{f.q}</h4>
                  <p className="text-neutral-500 text-sm leading-relaxed">{f.a}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SCENE 09 — CONTACT ===== */}
      <section id="contact" data-scene className="snap-start relative min-h-dvh flex flex-col justify-center py-24">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 w-full">
          <Reveal className="max-w-2xl mx-auto text-center">
            <Chapter no="09" label="Begin"/>
            <h2 className="font-semibold text-neutral-900 tracking-tight mb-5" style={{...fontDisplay,fontSize:'clamp(2rem,5vw,3.75rem)'}}>Ready to start?</h2>
            <p className="text-neutral-600 text-lg mb-6">Your next chapter begins with a simple message. Let&apos;s chat.</p>
            <div className={`rounded-3xl p-8 ${glass} mb-8 max-w-md mx-auto`}>
              <div className="flex items-center gap-4 mb-4">
                {profilePic?<img src={profilePic} alt={agentName} className="w-14 h-14 rounded-xl object-cover"/>:<div className="w-14 h-14 rounded-xl flex items-center justify-center text-black font-bold text-xl" style={{background:GOLD,...fontDisplay}}>{agentName[0]?.toUpperCase()}</div>}
                <div className="text-left">
                  <p className="font-semibold text-neutral-900" style={fontDisplay}>{agentName}</p>
                  <p className="text-sm" style={{color:GOLDT}}>{BRAND.jobTitle} · {ren}</p>
                </div>
              </div>
              <ul className="text-left space-y-2 text-sm text-neutral-600 mb-6">
                <li className="flex items-center gap-2">{Icons.location}<span>{BRAND.region}, {BRAND.country}</span></li>
                <li className="flex items-center gap-2">{Icons.wa}<span>{BRAND.phoneDisplay}</span></li>
                <li className="flex items-center gap-2">{Icons.chat}<span>{email}</span></li>
              </ul>
              <p className="text-xs text-neutral-400">Languages: {languages.join(', ')}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href={waHref(`Hi ${agentName}! I found your property page and would like to know more.`)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#1ebe5a] text-white font-semibold px-8 py-4 rounded-full transition-all duration-200 shadow-[0_10px_40px_-12px_rgba(37,211,102,0.7)] active:scale-[0.97]">{Icons.wa} WhatsApp Now</a>
              <a href={`mailto:${email}`} className={`inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold text-neutral-800 hover:text-neutral-900 transition-all duration-200 ${glass}`}>Email Us</a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/50 bg-white/20 backdrop-blur-sm">
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
                <li><a href={waHref('Hi! I found your property page.')} target="_blank" rel="noopener noreferrer" className="hover:text-[#8A6512] transition-colors">{BRAND.phoneDisplay}</a></li>
                <li><a href={`mailto:${email}`} className="hover:text-[#8A6512] transition-colors break-all">{email}</a></li>
                <li><a href={BRAND.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-[#8A6512] transition-colors">Facebook</a></li>
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
          <div className="pt-8 border-t border-white/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400">
            <p>© {new Date().getFullYear()} {company}. All rights reserved.</p>
            <p>{BRAND.region}, {BRAND.country}</p>
          </div>
        </div>
      </footer>

      {/* Jackson pops up and introduces each section as you scroll */}
      <GuideAvatar active={active}/>
    </div>
  )
}
