'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// Full-page WebGL background: a stylised low-poly property city.
// Suburban houses line the main street, mid-rise apartments sit behind them,
// and a downtown cluster of condo towers (with lit windows) rises in the
// distance. Cross streets with zebra crossings, street lamps, drifting
// clouds and traffic on every road. ACES tone mapping for a filmic look.
// Instanced meshes keep draw calls low; lighter counts + no shadows on mobile.
// Respects prefers-reduced-motion.
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
    scene.fog = new THREE.Fog(BG, 42, 130)

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 220)
    const camBase = new THREE.Vector3(9, 8.5, 13)
    camera.position.copy(camBase)
    const look = new THREE.Vector3(0, 0.6, -8)

    const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true, powerPreference: 'high-performance' })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.12
    renderer.shadowMap.enabled = !isMobile
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)

    // --- Lights ---
    scene.add(new THREE.HemisphereLight(0xfff6e6, 0xdaccb0, 1.05))
    const sun = new THREE.DirectionalLight(0xfff1d4, 2.2)
    sun.position.set(12, 22, 9)
    if (!isMobile) {
      sun.castShadow = true
      sun.shadow.mapSize.set(2048, 2048)
      sun.shadow.camera.near = 1
      sun.shadow.camera.far = 80
      const sc = sun.shadow.camera as THREE.OrthographicCamera
      sc.left = -26; sc.right = 26; sc.top = 26; sc.bottom = -26
      sun.shadow.bias = -0.0005
    }
    scene.add(sun)

    const town = new THREE.Group()
    scene.add(town)

    const pick = <T,>(a: T[]) => a[(Math.random() * a.length) | 0]
    const disposables: { dispose(): void }[] = []
    const track = <T extends { dispose(): void }>(o: T) => { disposables.push(o); return o }
    const dummy = new THREE.Object3D()

    // ---------- GROUND / ROADS ----------
    const groundMat = track(new THREE.MeshStandardMaterial({ color: 0xe9e7d6, roughness: 1 }))
    const ground = new THREE.Mesh(track(new THREE.PlaneGeometry(300, 300)), groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.02
    ground.receiveShadow = !isMobile
    town.add(ground)

    const roadMat = track(new THREE.MeshStandardMaterial({ color: 0x6f6a63, roughness: 1 }))
    const walkMat = track(new THREE.MeshStandardMaterial({ color: 0xcdc6b6, roughness: 1 }))

    // main road runs along z
    const road = new THREE.Mesh(track(new THREE.PlaneGeometry(3.4, 220)), roadMat)
    road.rotation.x = -Math.PI / 2
    road.receiveShadow = !isMobile
    town.add(road)
    const walkGeo = track(new THREE.PlaneGeometry(0.7, 220))
    for (const sx of [-2.1, 2.1]) {
      const w = new THREE.Mesh(walkGeo, walkMat)
      w.rotation.x = -Math.PI / 2; w.position.set(sx, 0.01, 0); w.receiveShadow = !isMobile
      town.add(w)
    }

    // cross streets run along x
    const CROSS_Z = [-12, -40, -68]
    const crossGeo = track(new THREE.PlaneGeometry(130, 3.0))
    for (const cz of CROSS_Z) {
      const c = new THREE.Mesh(crossGeo, roadMat)
      c.rotation.x = -Math.PI / 2; c.position.set(0, 0.005, cz); c.receiveShadow = !isMobile
      town.add(c)
    }

    // all lane dashes in ONE instanced mesh (main + cross roads)
    const dashGeo = track(new THREE.PlaneGeometry(0.12, 0.9))
    const dashMat = track(new THREE.MeshStandardMaterial({ color: 0xede6cf, roughness: 1 }))
    const dashXforms: { x: number; z: number; ry: number }[] = []
    for (let z = -105; z < 107; z += 3) {
      if (CROSS_Z.some(cz => Math.abs(z - cz) < 2.4)) continue
      dashXforms.push({ x: 0, z, ry: 0 })
    }
    for (const cz of CROSS_Z) {
      for (let x = -63; x < 65; x += 3) {
        if (Math.abs(x) < 2.6) continue
        dashXforms.push({ x, z: cz, ry: Math.PI / 2 })
      }
    }
    const dashes = new THREE.InstancedMesh(dashGeo, dashMat, dashXforms.length)
    dashXforms.forEach((d, i) => {
      dummy.position.set(d.x, 0.02, d.z)
      dummy.rotation.set(-Math.PI / 2, 0, d.ry)
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      dashes.setMatrixAt(i, dummy.matrix)
    })
    town.add(dashes)

    // zebra crossings at each intersection (instanced stripes)
    const zebraGeo = track(new THREE.PlaneGeometry(3.2, 0.32))
    const zebraMat = track(new THREE.MeshStandardMaterial({ color: 0xf2ecd9, roughness: 1 }))
    const zebraXf: { x: number; z: number }[] = []
    for (const cz of CROSS_Z) {
      for (const side of [-1, 1]) {
        for (let s = 0; s < 4; s++) zebraXf.push({ x: 0, z: cz + side * (2.1 + s * 0.52) })
      }
    }
    const zebras = new THREE.InstancedMesh(zebraGeo, zebraMat, zebraXf.length)
    zebraXf.forEach((zx, i) => {
      dummy.position.set(zx.x, 0.018, zx.z)
      dummy.rotation.set(-Math.PI / 2, 0, 0)
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      zebras.setMatrixAt(i, dummy.matrix)
    })
    town.add(zebras)

    // street lamps along the main road (instanced poles + warm heads)
    const poleGeo = track(new THREE.CylinderGeometry(0.028, 0.04, 1.7, 6))
    const poleMat = track(new THREE.MeshStandardMaterial({ color: 0x4a4a4f, roughness: 0.8 }))
    const headGeo = track(new THREE.SphereGeometry(0.09, 8, 8))
    const headMat = track(new THREE.MeshStandardMaterial({ color: 0xffe2a0, emissive: 0xffc860, emissiveIntensity: 0.5, roughness: 0.4 }))
    const lampPos: { x: number; z: number }[] = []
    for (let z = -100, i = 0; z <= 100; z += 9, i++) {
      if (CROSS_Z.some(cz => Math.abs(z - cz) < 2.5)) continue
      lampPos.push({ x: i % 2 === 0 ? -2.55 : 2.55, z })
    }
    const poles = new THREE.InstancedMesh(poleGeo, poleMat, lampPos.length)
    const heads = new THREE.InstancedMesh(headGeo, headMat, lampPos.length)
    lampPos.forEach((p, i) => {
      dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1)
      dummy.position.set(p.x, 0.85, p.z); dummy.updateMatrix(); poles.setMatrixAt(i, dummy.matrix)
      dummy.position.set(p.x, 1.75, p.z); dummy.updateMatrix(); heads.setMatrixAt(i, dummy.matrix)
    })
    town.add(poles, heads)

    // ---------- HOUSES ----------
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
      const door = new THREE.Mesh(doorGeo, doorMat); door.position.set(0, 0.28, 0.61); g.add(door)
      addWindow(g, -0.34, h * 0.62, 0.61, 0)
      addWindow(g, 0.34, h * 0.62, 0.61, 0)
      addWindow(g, -0.3, h * 0.62, -0.61, Math.PI)
      addWindow(g, 0.3, h * 0.62, -0.61, Math.PI)
      addWindow(g, 0.61, h * 0.6, 0.0, Math.PI / 2)
      addWindow(g, -0.61, h * 0.6, 0.0, -Math.PI / 2)
      const ch = new THREE.Mesh(chimneyGeo, chimneyMat); ch.position.set(0.3, h + 0.18, 0.18); ch.castShadow = !isMobile; g.add(ch)
      g.scale.setScalar(0.92 + Math.random() * 0.5)
      return g
    }

    // ---------- TOWER WINDOW TEXTURES (canvas — lit condo windows) ----------
    function makeTowerTexture(wall: string, cols: number, rows: number) {
      const c = document.createElement('canvas')
      c.width = 128; c.height = 256
      const ctx = c.getContext('2d')!
      ctx.fillStyle = wall
      ctx.fillRect(0, 0, c.width, c.height)
      const mx = 10, my = 12
      const cw = (c.width - mx * 2) / cols
      const chh = (c.height - my * 2) / rows
      for (let r = 0; r < rows; r++) {
        for (let q = 0; q < cols; q++) {
          const lit = Math.random() < 0.34
          ctx.fillStyle = lit ? (Math.random() < 0.5 ? '#ffd98f' : '#ffe9bd') : (Math.random() < 0.5 ? '#aec6d4' : '#93a8b6')
          ctx.fillRect(mx + q * cw + cw * 0.18, my + r * chh + chh * 0.2, cw * 0.64, chh * 0.55)
        }
      }
      const tex = new THREE.CanvasTexture(c)
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = 2
      return track(tex)
    }
    const towerWalls = ['#ded8ca', '#cfd4d6', '#d9cbb4', '#c9c2b2', '#d3cfc6']
    const towerMats = towerWalls.map(w => {
      const tex = makeTowerTexture(w, 6, 14)
      return track(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }))
    })
    const towerRoofMat = track(new THREE.MeshStandardMaterial({ color: 0x9a938a, roughness: 0.9 }))
    const towerGeo = track(new THREE.BoxGeometry(1, 1, 1))
    const towerCapGeo = track(new THREE.BoxGeometry(0.32, 0.22, 0.32))

    function makeTower(bw: number, h: number, bd: number) {
      const g = new THREE.Group()
      const body = new THREE.Mesh(towerGeo, pick(towerMats))
      body.scale.set(bw, h, bd)
      body.position.y = h / 2
      body.castShadow = false // too far for the shadow camera; fog softens them
      g.add(body)
      const cap = new THREE.Mesh(towerCapGeo, towerRoofMat)
      cap.position.y = h + 0.11
      g.add(cap)
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

    // ---------- CLOUDS (low-poly, matches the hero art) ----------
    const cloudGeo = track(new THREE.IcosahedronGeometry(1, 0))
    const cloudMat = track(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true, transparent: true, opacity: 0.92 }))
    type Cloud = { mesh: THREE.Group; speed: number }
    const clouds: Cloud[] = []
    const cloudCount = isMobile ? 4 : 7
    for (let i = 0; i < cloudCount; i++) {
      const g = new THREE.Group()
      const puffs = 3 + ((Math.random() * 2) | 0)
      for (let p = 0; p < puffs; p++) {
        const puff = new THREE.Mesh(cloudGeo, cloudMat)
        puff.position.set(p * 0.9 - puffs * 0.45 + Math.random() * 0.3, Math.random() * 0.25, Math.random() * 0.4)
        puff.scale.set(0.7 + Math.random() * 0.7, 0.45 + Math.random() * 0.3, 0.6 + Math.random() * 0.4)
        g.add(puff)
      }
      g.position.set(-60 + Math.random() * 120, 11 + Math.random() * 6, -75 + Math.random() * 95)
      g.scale.setScalar(2.2 + Math.random() * 2)
      town.add(g)
      clouds.push({ mesh: g, speed: 0.25 + Math.random() * 0.35 })
    }

    // ---------- CARS ----------
    const carBodyGeo = track(new THREE.BoxGeometry(0.32, 0.2, 0.62))
    const vanBodyGeo = track(new THREE.BoxGeometry(0.34, 0.3, 0.7))
    const carCabinGeo = track(new THREE.BoxGeometry(0.28, 0.17, 0.3))
    const taxiSignGeo = track(new THREE.BoxGeometry(0.12, 0.05, 0.1))
    const wheelGeo = track(new THREE.CylinderGeometry(0.085, 0.085, 0.07, 12))
    const carColors = [0xd94f4f, 0x4f7fd9, 0xf0b429, 0x4fae6a, 0xf2f2ee, 0x444a55, 0xe07a3c].map(c => track(new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, metalness: 0.1 })))
    const taxiMat = track(new THREE.MeshStandardMaterial({ color: 0xf5c518, roughness: 0.4, metalness: 0.1 }))
    const glassMat = track(new THREE.MeshStandardMaterial({ color: 0x2a3340, roughness: 0.2, metalness: 0.3 }))
    const tyreMat = track(new THREE.MeshStandardMaterial({ color: 0x1c1c1f, roughness: 0.8 }))
    function makeCar() {
      const g = new THREE.Group()
      const kind = Math.random()
      if (kind < 0.15) {
        // taxi
        const body = new THREE.Mesh(carBodyGeo, taxiMat); body.position.y = 0.15; body.castShadow = !isMobile
        const cabin = new THREE.Mesh(carCabinGeo, glassMat); cabin.position.set(0, 0.31, -0.02); cabin.castShadow = !isMobile
        const sign = new THREE.Mesh(taxiSignGeo, tyreMat); sign.position.set(0, 0.42, -0.02)
        g.add(body, cabin, sign)
      } else if (kind < 0.3) {
        // van
        const body = new THREE.Mesh(vanBodyGeo, pick(carColors)); body.position.y = 0.2; body.castShadow = !isMobile
        const cabin = new THREE.Mesh(carCabinGeo, glassMat); cabin.position.set(0, 0.38, 0.16); cabin.scale.set(1, 0.7, 0.6); cabin.castShadow = !isMobile
        g.add(body, cabin)
      } else {
        const body = new THREE.Mesh(carBodyGeo, pick(carColors)); body.position.y = 0.15; body.castShadow = !isMobile
        const cabin = new THREE.Mesh(carCabinGeo, glassMat); cabin.position.set(0, 0.31, -0.02); cabin.castShadow = !isMobile
        g.add(body, cabin)
      }
      for (const wx of [-0.15, 0.15]) for (const wz of [-0.2, 0.2]) {
        const wheel = new THREE.Mesh(wheelGeo, tyreMat); wheel.rotation.z = Math.PI / 2; wheel.position.set(wx, 0.07, wz)
        g.add(wheel)
      }
      return g
    }

    // ---------- POPULATE ----------
    // suburban houses lining the main street (skip intersections)
    const houseRows = isMobile ? 11 : 17
    for (const side of [-1, 1]) {
      for (let i = 0; i < houseRows; i++) {
        const z = 6 - i * 5.5 - Math.random() * 1.2
        if (CROSS_Z.some(cz => Math.abs(z - cz) < 3)) continue
        const house = makeHouse()
        house.position.set(side * (3.4 + Math.random() * 0.6), 0, z)
        house.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2
        town.add(house)
      }
    }

    // mid-rise apartment blocks in the second row behind the houses
    const midCount = isMobile ? 8 : 14
    for (let i = 0; i < midCount; i++) {
      const side = i % 2 === 0 ? -1 : 1
      const h = 2.2 + Math.random() * 2.6
      const t = makeTower(1.6 + Math.random() * 0.9, h, 1.4 + Math.random() * 0.8)
      const z = 4 - Math.random() * 88
      if (CROSS_Z.some(cz => Math.abs(z - cz) < 2.6)) continue
      t.position.set(side * (6.8 + Math.random() * 3.2), 0, z)
      t.rotation.y = (Math.random() - 0.5) * 0.3
      town.add(t)
    }

    // downtown skyline — condo towers clustered at the far end of the drive
    const towerCount = isMobile ? 9 : 18
    for (let i = 0; i < towerCount; i++) {
      const h = 5.5 + Math.random() * 8.5
      const t = makeTower(1.8 + Math.random() * 1.4, h, 1.8 + Math.random() * 1.2)
      const x = (Math.random() - 0.5) * 34
      if (Math.abs(x) < 2.6) continue // keep the road corridor clear
      t.position.set(x, 0, -78 - Math.random() * 34)
      town.add(t)
    }

    // trees along the verges (avoid intersections)
    const treeCount = isMobile ? 18 : 32
    for (let i = 0; i < treeCount; i++) {
      const z = -95 + Math.random() * 185
      if (CROSS_Z.some(cz => Math.abs(z - cz) < 2.4)) continue
      const tree = makeTree()
      const side = Math.random() < 0.5 ? -1 : 1
      tree.position.set(side * (2.5 + Math.random() * 0.4), 0, z)
      town.add(tree)
    }

    // traffic — main road (z axis) and cross streets (x axis)
    type Car = { mesh: THREE.Group; axis: 'z' | 'x'; fixed: number; dir: number; speed: number }
    const cars: Car[] = []
    const zMin = -105, zMax = 107, xMin = -60, xMax = 60
    const mainCars = isMobile ? 6 : 12
    for (let i = 0; i < mainCars; i++) {
      const mesh = makeCar()
      const dir = i % 2 === 0 ? 1 : -1
      const lane = dir > 0 ? 0.75 : -0.75
      mesh.rotation.y = dir > 0 ? 0 : Math.PI
      mesh.position.set(lane, 0, zMin + Math.random() * (zMax - zMin))
      town.add(mesh)
      cars.push({ mesh, axis: 'z', fixed: lane, dir, speed: 3.2 + Math.random() * 2.4 })
    }
    const crossCars = isMobile ? 3 : 6
    for (let i = 0; i < crossCars; i++) {
      const mesh = makeCar()
      const cz = CROSS_Z[i % CROSS_Z.length]
      const dir = i % 2 === 0 ? 1 : -1
      const lane = cz + (dir > 0 ? 0.7 : -0.7)
      mesh.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2
      mesh.position.set(xMin + Math.random() * (xMax - xMin), 0, lane)
      town.add(mesh)
      cars.push({ mesh, axis: 'x', fixed: lane, dir, speed: 2.8 + Math.random() * 2 })
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
      driveTarget = p * 72 // travel down the street toward downtown as you scroll
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
          if (c.axis === 'z') {
            c.mesh.position.z += c.dir * c.speed * dt
            if (c.dir > 0 && c.mesh.position.z > zMax) c.mesh.position.z = zMin
            if (c.dir < 0 && c.mesh.position.z < zMin) c.mesh.position.z = zMax
          } else {
            c.mesh.position.x += c.dir * c.speed * dt
            if (c.dir > 0 && c.mesh.position.x > xMax) c.mesh.position.x = xMin
            if (c.dir < 0 && c.mesh.position.x < xMin) c.mesh.position.x = xMax
          }
        }
        for (const cl of clouds) {
          cl.mesh.position.x += cl.speed * dt
          if (cl.mesh.position.x > 70) cl.mesh.position.x = -70
        }
        drive += (driveTarget - drive) * 0.05
      }
      camera.position.set(camBase.x + mx * 2.5, camBase.y - my * 1.5, camBase.z - drive)
      look.z = -8 - drive
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
      dashes.dispose(); zebras.dispose(); poles.dispose(); heads.dispose()
      for (const d of disposables) d.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} className="w-full h-full" aria-hidden />
}
