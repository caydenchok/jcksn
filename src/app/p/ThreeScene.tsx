'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// Full-page WebGL background: a stylised low-poly neighbourhood — houses with
// windows & doors, a road with lane markings & sidewalks, trees, and cars
// driving along the street. Soft shadows on desktop. Inspired by Infinitown.
// Respects prefers-reduced-motion; lighter on mobile.
export default function ThreeScene() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isMobile = window.matchMedia('(max-width: 767px)').matches

    let width = mount.clientWidth || window.innerWidth
    let height = mount.clientHeight || window.innerHeight

    const BG = 0xf7f1e6
    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(BG, 26, 70)

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 160)
    const camBase = new THREE.Vector3(9, 8.5, 13)
    camera.position.copy(camBase)
    const look = new THREE.Vector3(0, 0.6, -5)

    const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true, powerPreference: 'high-performance' })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2))
    renderer.shadowMap.enabled = !isMobile
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)

    // --- Lights ---
    scene.add(new THREE.HemisphereLight(0xfff6e6, 0xdaccb0, 1.0))
    const sun = new THREE.DirectionalLight(0xfff1d4, 2.0)
    sun.position.set(12, 20, 9)
    if (!isMobile) {
      sun.castShadow = true
      sun.shadow.mapSize.set(1024, 1024)
      sun.shadow.camera.near = 1
      sun.shadow.camera.far = 70
      const sc = sun.shadow.camera as THREE.OrthographicCamera
      sc.left = -22; sc.right = 22; sc.top = 22; sc.bottom = -22
      sun.shadow.bias = -0.0005
    }
    scene.add(sun)

    const town = new THREE.Group()
    scene.add(town)

    const pick = <T,>(a: T[]) => a[(Math.random() * a.length) | 0]
    const disposables: { dispose(): void }[] = []
    const track = <T extends { dispose(): void }>(o: T) => { disposables.push(o); return o }

    // ---------- GROUND / ROAD ----------
    const groundMat = track(new THREE.MeshStandardMaterial({ color: 0xe9e7d6, roughness: 1 }))
    const ground = new THREE.Mesh(track(new THREE.PlaneGeometry(120, 120)), groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.02
    ground.receiveShadow = !isMobile
    town.add(ground)

    const roadMat = track(new THREE.MeshStandardMaterial({ color: 0x6f6a63, roughness: 1 }))
    const road = new THREE.Mesh(track(new THREE.PlaneGeometry(3.4, 110)), roadMat)
    road.rotation.x = -Math.PI / 2
    road.position.y = 0.0
    road.receiveShadow = !isMobile
    town.add(road)

    const walkMat = track(new THREE.MeshStandardMaterial({ color: 0xcdc6b6, roughness: 1 }))
    const walkGeo = track(new THREE.PlaneGeometry(0.7, 110))
    for (const sx of [-2.1, 2.1]) {
      const w = new THREE.Mesh(walkGeo, walkMat)
      w.rotation.x = -Math.PI / 2; w.position.set(sx, 0.01, 0); w.receiveShadow = !isMobile
      town.add(w)
    }
    // dashed centre line
    const dashGeo = track(new THREE.PlaneGeometry(0.12, 0.9))
    const dashMat = track(new THREE.MeshStandardMaterial({ color: 0xede6cf, roughness: 1 }))
    for (let z = -50; z < 52; z += 3) {
      const dash = new THREE.Mesh(dashGeo, dashMat)
      dash.rotation.x = -Math.PI / 2; dash.position.set(0, 0.02, z)
      town.add(dash)
    }

    // ---------- SHARED GEO / MATS ----------
    const boxGeo = track(new THREE.BoxGeometry(1.2, 1, 1.2))
    const roofShape = new THREE.Shape()
    roofShape.moveTo(-0.66, 0); roofShape.lineTo(0.66, 0); roofShape.lineTo(0, 0.6); roofShape.closePath()
    const roofGeo = track(new THREE.ExtrudeGeometry(roofShape, { depth: 1.3, bevelEnabled: false }))
    roofGeo.translate(0, 0, -0.65)
    const winGeo = track(new THREE.PlaneGeometry(0.26, 0.3))
    const doorGeo = track(new THREE.PlaneGeometry(0.3, 0.55))
    const chimneyGeo = track(new THREE.BoxGeometry(0.16, 0.42, 0.16))

    const wallMats = [0xf3efe4, 0xe9d9bd, 0xdcc6a3, 0xf0e2c4, 0xe7ccc0, 0xd6d8cf].map(c => track(new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 })))
    const roofMats = [0xc15a3c, 0x3c3a40, 0x5d6f7d, 0xe2a93b, 0xab4536, 0x8a6d4b].map(c => track(new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, metalness: 0.05 })))
    const winMats = [0xbfe2f0, 0xd4ecf5, 0xffe2a0, 0xcfe0ec].map(c => track(new THREE.MeshStandardMaterial({ color: c, emissive: new THREE.Color(c), emissiveIntensity: 0.25, roughness: 0.3 })))
    const doorMat = track(new THREE.MeshStandardMaterial({ color: 0x6e4a30, roughness: 0.8 }))
    const chimneyMat = track(new THREE.MeshStandardMaterial({ color: 0x8a6d4b, roughness: 0.9 }))

    function addWindow(g: THREE.Group, x: number, y: number, z: number, ry: number) {
      const m = new THREE.Mesh(winGeo, pick(winMats))
      m.position.set(x, y, z); m.rotation.y = ry
      g.add(m)
    }
    function makeHouse() {
      const g = new THREE.Group()
      const h = 0.95 + Math.random() * 0.7
      const body = new THREE.Mesh(boxGeo, pick(wallMats))
      body.scale.y = h; body.position.y = h / 2
      body.castShadow = !isMobile; body.receiveShadow = !isMobile
      g.add(body)
      const roof = new THREE.Mesh(roofGeo, pick(roofMats))
      roof.position.y = h; roof.scale.set(1, 0.8 + Math.random() * 0.5, 0.92)
      roof.castShadow = !isMobile
      g.add(roof)
      // door + windows on front (+z) and back (-z)
      const door = new THREE.Mesh(doorGeo, doorMat); door.position.set(0, 0.28, 0.61); g.add(door)
      addWindow(g, -0.34, h * 0.62, 0.61, 0)
      addWindow(g, 0.34, h * 0.62, 0.61, 0)
      addWindow(g, -0.3, h * 0.62, -0.61, Math.PI)
      addWindow(g, 0.3, h * 0.62, -0.61, Math.PI)
      // side windows (x faces)
      addWindow(g, 0.61, h * 0.6, 0.0, Math.PI / 2)
      addWindow(g, -0.61, h * 0.6, 0.0, -Math.PI / 2)
      // chimney
      const ch = new THREE.Mesh(chimneyGeo, chimneyMat); ch.position.set(0.3, h + 0.18, 0.18); ch.castShadow = !isMobile; g.add(ch)
      g.scale.setScalar(0.92 + Math.random() * 0.5)
      return g
    }

    // ---------- TREES ----------
    const trunkGeo = track(new THREE.CylinderGeometry(0.08, 0.1, 0.5, 6))
    const foliageGeo = track(new THREE.IcosahedronGeometry(0.42, 0))
    const trunkMat = track(new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1 }))
    const foliageMats = [0x6f9a52, 0x84a85f, 0x5c8a4a, 0x9bb36a].map(c => track(new THREE.MeshStandardMaterial({ color: c, roughness: 1, flatShading: true })))
    function makeTree() {
      const g = new THREE.Group()
      const trunk = new THREE.Mesh(trunkGeo, trunkMat); trunk.position.y = 0.25; trunk.castShadow = !isMobile
      const fol = new THREE.Mesh(foliageGeo, pick(foliageMats)); fol.position.y = 0.78; fol.scale.setScalar(0.9 + Math.random() * 0.7); fol.castShadow = !isMobile
      g.add(trunk, fol)
      g.scale.setScalar(0.85 + Math.random() * 0.6)
      return g
    }

    // ---------- CARS ----------
    const carBodyGeo = track(new THREE.BoxGeometry(0.32, 0.2, 0.62))
    const carCabinGeo = track(new THREE.BoxGeometry(0.28, 0.17, 0.3))
    const wheelGeo = track(new THREE.CylinderGeometry(0.085, 0.085, 0.07, 12))
    const carColors = [0xd94f4f, 0x4f7fd9, 0xf0b429, 0x4fae6a, 0xf2f2ee, 0x444a55, 0xe07a3c].map(c => track(new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, metalness: 0.1 })))
    const glassMat = track(new THREE.MeshStandardMaterial({ color: 0x2a3340, roughness: 0.2, metalness: 0.3 }))
    const tyreMat = track(new THREE.MeshStandardMaterial({ color: 0x1c1c1f, roughness: 0.8 }))
    function makeCar() {
      const g = new THREE.Group()
      const body = new THREE.Mesh(carBodyGeo, pick(carColors)); body.position.y = 0.15; body.castShadow = !isMobile
      const cabin = new THREE.Mesh(carCabinGeo, glassMat); cabin.position.set(0, 0.31, -0.02); cabin.castShadow = !isMobile
      g.add(body, cabin)
      for (const wx of [-0.15, 0.15]) for (const wz of [-0.2, 0.2]) {
        const wheel = new THREE.Mesh(wheelGeo, tyreMat); wheel.rotation.z = Math.PI / 2; wheel.position.set(wx, 0.07, wz)
        g.add(wheel)
      }
      return g
    }

    // ---------- POPULATE ----------
    const houseRows = isMobile ? 6 : 8
    for (const side of [-1, 1]) {
      for (let i = 0; i < houseRows; i++) {
        const house = makeHouse()
        house.position.set(side * (3.4 + Math.random() * 0.6), 0, 6 - i * 5 - Math.random() * 1.2)
        house.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2 // face the road
        town.add(house)
      }
    }
    const treeCount = isMobile ? 10 : 18
    for (let i = 0; i < treeCount; i++) {
      const tree = makeTree()
      const side = Math.random() < 0.5 ? -1 : 1
      tree.position.set(side * (2.5 + Math.random() * 0.4), 0, -42 + Math.random() * 90)
      town.add(tree)
    }

    type Car = { mesh: THREE.Group; lane: number; dir: number; speed: number }
    const cars: Car[] = []
    const carCount = isMobile ? 4 : 7
    const zMin = -50, zMax = 52
    for (let i = 0; i < carCount; i++) {
      const mesh = makeCar()
      const dir = i % 2 === 0 ? 1 : -1
      const lane = dir > 0 ? 0.75 : -0.75
      mesh.rotation.y = dir > 0 ? 0 : Math.PI
      const z = zMin + Math.random() * (zMax - zMin)
      mesh.position.set(lane, 0, z)
      town.add(mesh)
      cars.push({ mesh, lane, dir, speed: 3.2 + Math.random() * 2.4 })
    }

    // ---------- INTERACTION ----------
    let mx = 0, my = 0
    const onMove = (e: MouseEvent) => { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5 }
    window.addEventListener('mousemove', onMove)

    let driveTarget = 0
    const onScroll = () => {
      const el = document.scrollingElement || document.documentElement
      const max = el.scrollHeight - el.clientHeight
      const p = max > 0 ? el.scrollTop / max : 0
      driveTarget = p * 30 // travel down the street as you scroll
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    const clock = new THREE.Clock()
    let drive = 0
    let raf = 0
    const animate = () => {
      const dt = Math.min(clock.getDelta(), 0.05)
      if (!reduced) {
        for (const c of cars) {
          c.mesh.position.z += c.dir * c.speed * dt
          if (c.dir > 0 && c.mesh.position.z > zMax) c.mesh.position.z = zMin
          if (c.dir < 0 && c.mesh.position.z < zMin) c.mesh.position.z = zMax
        }
        drive += (driveTarget - drive) * 0.05
      }
      camera.position.set(camBase.x + mx * 2.5, camBase.y - my * 1.5, camBase.z - drive)
      look.z = -5 - drive
      camera.lookAt(look)
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

    const onVisibility = () => {
      if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0 } }
      else if (!raf) { clock.getDelta(); animate() }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
      for (const d of disposables) d.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} className="w-full h-full" aria-hidden />
}
