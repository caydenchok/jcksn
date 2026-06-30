'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// Full-page WebGL background: a 3D neighbourhood of low-poly houses (the
// ZERO88 property theme) that gently drift and that you "fly through" as you
// scroll the page. Gold/cream palette, fog-blended into the cream background,
// sitting behind the glass scenes. Respects prefers-reduced-motion.
export default function ThreeScene() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const isMobile = window.matchMedia('(max-width: 767px)').matches

    let width = mount.clientWidth || window.innerWidth
    let height = mount.clientHeight || window.innerHeight

    const BG = 0xfaf7f0
    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(BG, 9, 30)

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100)
    camera.position.set(0, 0, 7)

    const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true, powerPreference: 'low-power' })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2))
    mount.appendChild(renderer.domElement)

    // --- Lights ---
    const key = new THREE.DirectionalLight(0xffffff, 2.2)
    key.position.set(6, 9, 6)
    scene.add(key)
    const goldFill = new THREE.PointLight(0xe2a93b, 50, 60)
    goldFill.position.set(-7, 2, 5)
    scene.add(goldFill)
    scene.add(new THREE.AmbientLight(0xfff1d6, 0.85))

    // --- Shared geometry / materials (reused across houses) ---
    const bodyGeo = new THREE.BoxGeometry(1, 0.85, 1)
    const roofGeo = new THREE.ConeGeometry(0.82, 0.6, 4) // 4 sides = pyramid roof
    const chimneyGeo = new THREE.BoxGeometry(0.16, 0.4, 0.16)
    const wallColors = [0xf4e6c8, 0xeaD9bc, 0xf6edda, 0xe9d3a6]
    const roofColors = [0xe2a93b, 0xc99a3a, 0xd9a94e, 0xb8851f]
    const wallMats = wallColors.map(c => new THREE.MeshStandardMaterial({ color: c, metalness: 0.2, roughness: 0.65, flatShading: true }))
    const roofMats = roofColors.map(c => new THREE.MeshStandardMaterial({ color: c, metalness: 0.55, roughness: 0.35, flatShading: true }))
    const chimneyMat = new THREE.MeshStandardMaterial({ color: 0xb8851f, metalness: 0.5, roughness: 0.4, flatShading: true })

    const field = new THREE.Group()
    scene.add(field)

    const houses: THREE.Object3D[] = []
    const COUNT = isMobile ? 16 : 30
    for (let i = 0; i < COUNT; i++) {
      const h = new THREE.Group()
      const wm = wallMats[(Math.random() * wallMats.length) | 0]
      const rm = roofMats[(Math.random() * roofMats.length) | 0]
      const body = new THREE.Mesh(bodyGeo, wm)
      const roof = new THREE.Mesh(roofGeo, rm)
      roof.position.y = 0.72
      roof.rotation.y = Math.PI / 4
      const chimney = new THREE.Mesh(chimneyGeo, chimneyMat)
      chimney.position.set(0.28, 0.85, 0.1)
      h.add(body, roof, chimney)

      const s = 0.6 + Math.random() * 1.0
      h.scale.setScalar(s)
      h.position.set(
        (Math.random() - 0.5) * 22,
        (Math.random() - 0.5) * 11,
        -2 - Math.random() * 26
      )
      h.rotation.y = Math.random() * Math.PI * 2
      h.userData = { baseY: h.position.y, phase: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 0.004 }
      field.add(h)
      houses.push(h)
    }

    // --- Floating gold motes ---
    const pCount = isMobile ? 50 : 120
    const pGeo = new THREE.BufferGeometry()
    const pos = new Float32Array(pCount * 3)
    for (let i = 0; i < pCount * 3; i++) pos[i] = (Math.random() - 0.5) * 30
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const pMat = new THREE.PointsMaterial({ color: 0xe2a93b, size: 0.07, transparent: true, opacity: 0.5, depthWrite: false })
    const motes = new THREE.Points(pGeo, pMat)
    scene.add(motes)

    // --- Interaction state ---
    let mx = 0, my = 0
    const onMove = (e: MouseEvent) => {
      mx = e.clientX / window.innerWidth - 0.5
      my = e.clientY / window.innerHeight - 0.5
    }
    window.addEventListener('mousemove', onMove)

    let targetZ = 0
    const onScroll = () => {
      const el = document.scrollingElement || document.documentElement
      const max = el.scrollHeight - el.clientHeight
      const p = max > 0 ? el.scrollTop / max : 0
      targetZ = p * 30 // fly through the neighbourhood as you scroll
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    const clock = new THREE.Clock()
    let raf = 0
    const animate = () => {
      const t = clock.getElapsedTime()
      if (!reduced) {
        for (const h of houses) {
          h.rotation.y += h.userData.spin
          h.position.y = h.userData.baseY + Math.sin(t * 0.5 + h.userData.phase) * 0.18
        }
        motes.rotation.y = t * 0.03
        field.position.z += (targetZ - field.position.z) * 0.05
        field.rotation.y = mx * 0.12
      }
      camera.position.x += (mx * 0.9 - camera.position.x) * 0.04
      camera.position.y += (-my * 0.6 - camera.position.y) * 0.04
      camera.lookAt(0, 0, 0)
      renderer.render(scene, camera)
      raf = requestAnimationFrame(animate)
    }
    animate()

    const onResize = () => {
      width = mount.clientWidth || window.innerWidth
      height = mount.clientHeight || window.innerHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    window.addEventListener('resize', onResize)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      bodyGeo.dispose(); roofGeo.dispose(); chimneyGeo.dispose()
      wallMats.forEach(m => m.dispose()); roofMats.forEach(m => m.dispose()); chimneyMat.dispose()
      pGeo.dispose(); pMat.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} className="w-full h-full" aria-hidden />
}
